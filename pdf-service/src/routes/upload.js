import express from 'express'
import multer from 'multer'
import { randomUUID } from 'crypto'
import { unlink } from 'fs/promises'
import axios from 'axios'
import { extractText } from '../services/extractor.js'
import { analyzeWithGemini } from '../services/gemini.js'
import { saveToDirectus, saveToPaperless } from '../services/storage.js'

const router = express.Router()

const directusClient = axios.create({
  baseURL: process.env.DIRECTUS_URL || 'http://directus:8055',
  headers: { Authorization: `Bearer ${process.env.DIRECTUS_TOKEN}` },
})

async function findMatchingJobs(analiz) {
  try {
    let filter = {}
    if (analiz.ada && analiz.parsel) {
      filter._and = [
        { ada: { _eq: analiz.ada } },
        { parsel: { _eq: analiz.parsel } },
      ]
    } else if (analiz.mahalle) {
      filter = { mahalle_adi: { _icontains: analiz.mahalle } }
      if (analiz.ilce) filter.ilce_adi = { _icontains: analiz.ilce }
    } else {
      return []
    }
    const res = await directusClient.get('/items/kudeb_isler', {
      params: {
        filter: JSON.stringify(filter),
        limit: 5,
        sort: '-id',
        fields: 'id,is_no,ilce_adi,mahalle_adi,ada,parsel,gorevli_personel,son_durum,is_turu_adi',
      },
    })
    return res.data?.data || []
  } catch {
    return []
  }
}

async function getNextIsNo() {
  try {
    const year = new Date().getFullYear()
    const res = await directusClient.get('/items/kudeb_isler', {
      params: {
        filter: JSON.stringify({ is_no: { _starts_with: `${year}-` } }),
        sort: '-is_no',
        limit: 1,
        fields: 'is_no',
      },
    })
    const last = res.data?.data?.[0]?.is_no
    if (last) {
      const num = parseInt(last.split('-')[1] || '0')
      return `${year}-${String(num + 1).padStart(3, '0')}`
    }
    return `${year}-001`
  } catch {
    return `${new Date().getFullYear()}-001`
  }
}

// Geçici dosyaları /tmp'ye yaz, max 50MB
const upload = multer({
  dest: '/tmp/',
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    cb(null, allowed.includes(file.mimetype))
  },
})

/**
 * POST /upload/analiz
 * Sadece analiz eder, Directus/Paperless'a kaydetmez.
 * Döner: { analiz, eslesen_isler, next_is_no }
 */
router.post('/analiz', upload.single('file'), async (req, res) => {
  const tmpPath = req.file?.path
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya bulunamadı.' })

    const { metin } = await extractText(tmpPath, req.file.mimetype)
    const analiz = await analyzeWithGemini(metin, '')
    const [eslesen_isler, next_is_no] = await Promise.all([
      findMatchingJobs(analiz),
      getNextIsNo(),
    ])

    await unlink(tmpPath).catch(() => {})
    res.json({ analiz, eslesen_isler, next_is_no })
  } catch (err) {
    console.error('Analiz hatası:', err)
    if (tmpPath) await unlink(tmpPath).catch(() => {})
    res.status(500).json({ error: err.message || 'Sunucu hatası.' })
  }
})

/**
 * POST /upload
 * Body (multipart/form-data):
 *   file    — PDF veya Word dosyası
 *   is_no   — "2025-001"  (zorunlu)
 *   is_id   — Directus job UUID (opsiyonel, özet güncellemek için)
 *   mevcut_ozet — mevcut iş özeti (harmanlama için Gemini'ye gönderilir)
 */
router.post('/', upload.single('file'), async (req, res) => {
  const tmpPath = req.file?.path

  try {
    const { is_no, is_id, mevcut_ozet = '' } = req.body

    if (!req.file) return res.status(400).json({ error: 'Dosya bulunamadı.' })
    if (!is_no)    return res.status(400).json({ error: 'is_no zorunlu.' })

    // 1. Metin çıkar
    const { metin, sayfa_sayisi } = await extractText(tmpPath, req.file.mimetype)

    // 2. Gemini analizi
    const analiz = await analyzeWithGemini(metin, mevcut_ozet)

    // 3. Directus'a kaydet (kudeb_belgeler)
    const belgeId = await saveToDirectus({
      is_no,
      dosya_adi: req.file.originalname,
      tur: analiz.tur || 'Gelen',
      kimden: analiz.kimden || '',
      kime: analiz.kime || '',
      tarih: analiz.tarih || null,
      konu: analiz.konu || '',
      ozet: analiz.ozet || '',
      tam_metin: metin.slice(0, 32000),
    })

    // 4. Paperless-ngx'e yükle (orijinal PDF)
    const paperlessId = await saveToPaperless(tmpPath, req.file.originalname, {
      is_no,
      ilce: analiz.ilce,
      mahalle: analiz.mahalle,
      ada: analiz.ada,
      parsel: analiz.parsel,
      tarih: analiz.tarih,
      sayi: analiz.sayi,
    })

    // Paperless ID'yi Directus belge kaydına ekle
    if (paperlessId && belgeId) {
      await saveToDirectus({ paperless_id: paperlessId }, belgeId)
    }

    // 5. Geçici dosyayı sil
    await unlink(tmpPath).catch(() => {})

    res.json({
      success: true,
      belge_id: belgeId,
      paperless_id: paperlessId,
      sayfa_sayisi,
      analiz,  // React formu bu veriyle dolar
    })

  } catch (err) {
    console.error('Upload hatası:', err)
    if (tmpPath) await unlink(tmpPath).catch(() => {})
    res.status(500).json({ error: err.message || 'Sunucu hatası.' })
  }
})

/**
 * GET /upload/belgeler/:is_no
 * Bir işe ait tüm belgeleri döner
 */
router.get('/belgeler/:is_no', async (req, res) => {
  try {
    const { getBelgelerByIsNo } = await import('../services/storage.js')
    const belgeler = await getBelgelerByIsNo(req.params.is_no)
    res.json({ data: belgeler })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /upload/belgeler/:belge_id
 * Directus'tan belgeyi siler (Paperless'ta kayıt kalır)
 */
router.delete('/belgeler/:belge_id', async (req, res) => {
  try {
    const { deleteBelge } = await import('../services/storage.js')
    await deleteBelge(req.params.belge_id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
