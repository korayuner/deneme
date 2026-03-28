import express from 'express'
import multer from 'multer'
import { unlink } from 'fs/promises'
import axios from 'axios'
import { extractText } from '../services/extractor.js'
import { analyzeWithGemini, analyzeFileWithGemini } from '../services/gemini.js'
import { saveToDirectus, saveToPaperless, deleteBelge, getBelgelerByIsNo } from '../services/storage.js'

const router = express.Router()

const directusClient = axios.create({
  baseURL: process.env.DIRECTUS_URL || 'http://directus:8055',
  headers: { Authorization: `Bearer ${process.env.DIRECTUS_TOKEN}` },
})

// ─── Yardımcı: Levenshtein mesafesi (fuzzy match) ────────────────────────────

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// ─── Yardımcı: İşleri bul (tam + fuzzy) ─────────────────────────────────────

async function findMatchingJobs(analiz) {
  if (!analiz.ada && !analiz.parsel && !analiz.mahalle) return []

  const tolerans = 2 // Levenshtein toleransı

  try {
    // Geniş havuz: ilçe veya mahalle bazlı
    const filter = {}
    if (analiz.ilce) filter.ilce_adi = { _icontains: analiz.ilce }
    else if (analiz.mahalle) filter.mahalle_adi = { _icontains: analiz.mahalle }

    const res = await directusClient.get('/items/kudeb_isler', {
      params: {
        filter: Object.keys(filter).length ? JSON.stringify(filter) : undefined,
        limit: 100,
        sort: '-id',
        fields: 'id,is_no,ilce_adi,mahalle_adi,ada,parsel,eski_ada,eski_parsel,gorevli_personel,son_durum,is_turu_adi',
      },
    })
    const havuz = res.data?.data || []

    const sonuclar = []

    for (const is of havuz) {
      // Tam eşleşme
      const tamAda    = analiz.ada    && is.ada    === analiz.ada
      const tamParsel = analiz.parsel && is.parsel === analiz.parsel
      const tamEskiAda    = analiz.ada    && is.eski_ada    === analiz.ada
      const tamEskiParsel = analiz.parsel && is.eski_parsel === analiz.parsel

      if (tamAda && tamParsel) {
        sonuclar.push({ ...is, eslesme: 'tam', uyari: null, skor: 0 })
        continue
      }
      if ((tamEskiAda && tamParsel) || (tamAda && tamEskiParsel)) {
        sonuclar.push({ ...is, eslesme: 'eski_tapu', uyari: 'Eski tapu numarasıyla eşleşti', skor: 1 })
        continue
      }

      // Fuzzy eşleşme (OCR hatası toleransı)
      if (analiz.ada && is.ada) {
        const dist = levenshtein(String(analiz.ada), String(is.ada))
        if (dist <= tolerans && dist > 0) {
          const uyari = `Ada yazım hatası olabilir: belgede "${analiz.ada}", kayıtta "${is.ada}"`
          const parselEsles = !analiz.parsel || is.parsel === analiz.parsel
          if (parselEsles) {
            sonuclar.push({ ...is, eslesme: 'fuzzy', uyari, skor: dist })
            continue
          }
        }
      }
    }

    // Skor'a göre sırala, max 5 sonuç
    sonuclar.sort((a, b) => a.skor - b.skor)
    return sonuclar.slice(0, 5)

  } catch (err) {
    console.warn('findMatchingJobs hatası:', err.message)
    return []
  }
}

async function getNextIsNo() {
  try {
    const year = new Date().getFullYear()
    const res = await directusClient.get('/items/kudeb_isler', {
      params: {
        filter: JSON.stringify({
          _and: [
            { is_no: { _starts_with: `${year}-` } },
            { parent_id: { _null: true } },
            { is_no: { _ncontains: '-A' } },
          ],
        }),
        sort: '-is_no',
        limit: 1,
        fields: 'is_no',
      },
    })
    const last = res.data?.data?.[0]?.is_no
    if (last) {
      const parts = last.split('-')
      const num = parseInt(parts[1] || '0')
      return `${year}-${String(num + 1).padStart(3, '0')}`
    }
    return `${year}-001`
  } catch {
    return `${new Date().getFullYear()}-001`
  }
}

// ─── Multer ─────────────────────────────────────────────────────────────────

const upload = multer({
  dest: '/tmp/',
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    cb(null, allowed.includes(file.mimetype))
  },
})

// ─── POST /analiz — Sadece analiz ───────────────────────────────────────────

router.post('/analiz', upload.single('file'), async (req, res) => {
  const tmpPath = req.file?.path
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya bulunamadı.' })

    const { metin, tarama } = await extractText(tmpPath, req.file.mimetype)
    const analiz = tarama
      ? await analyzeFileWithGemini(tmpPath, req.file.mimetype, '')
      : await analyzeWithGemini(metin, '')

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

// ─── POST / — Analiz + Kaydet ────────────────────────────────────────────────
// Body (multipart/form-data):
//   file          — PDF / Word / TXT
//   is_no         — "2026-031"  (zorunlu)
//   is_id         — Directus iş ID (opsiyonel)
//   mevcut_ozet   — mevcut iş özeti (harmanlama)

router.post('/', upload.single('file'), async (req, res) => {
  const tmpPath = req.file?.path
  try {
    const { is_no, is_id, mevcut_ozet = '' } = req.body

    if (!req.file) return res.status(400).json({ error: 'Dosya bulunamadı.' })
    if (!is_no)    return res.status(400).json({ error: 'is_no zorunlu.' })

    // 1. Metin çıkar
    const { metin, sayfa_sayisi, tarama } = await extractText(tmpPath, req.file.mimetype)

    // 2. Gemini analizi — tarama PDF ise dosyayı doğrudan Vision API'ye gönder
    const analiz = tarama
      ? await analyzeFileWithGemini(tmpPath, req.file.mimetype, mevcut_ozet)
      : await analyzeWithGemini(metin, mevcut_ozet)

    // 3. Eşleşen iş ve uyarı
    let isIds = []
    let uyari = null

    if (is_id) {
      isIds = [parseInt(is_id)]
      // Fuzzy kontrol
      const eslesen = await findMatchingJobs(analiz)
      const esEslesen = eslesen.find((e) => e.id === parseInt(is_id))
      if (esEslesen?.eslesme === 'fuzzy') uyari = esEslesen.uyari
    }

    // 4. Directus belge kaydı
    const belgeId = await saveToDirectus({
      dosya_adi: req.file.originalname,
      tur: analiz.tur || 'Gelen',
      kimden: analiz.kimden || '',
      kime: analiz.kime || '',
      tarih: analiz.tarih || null,
      sayi: analiz.sayi || '',
      konu: analiz.konu || '',
      ozet: analiz.ozet || '',
      ilce: analiz.ilce || '',
      mahalle: analiz.mahalle || '',
      ada: analiz.ada || '',
      parsel: analiz.parsel || '',
      tam_metin: metin.slice(0, 32000),
    }, isIds, uyari)

    // 5. Paperless'a yükle
    const paperlessId = await saveToPaperless(tmpPath, req.file.originalname, {
      is_no,
      ilce: analiz.ilce,
      mahalle: analiz.mahalle,
      ada: analiz.ada,
      parsel: analiz.parsel,
      tarih: analiz.tarih,
      sayi: analiz.sayi,
    })

    // 6. Paperless ID'yi belge kaydına yaz
    if (paperlessId && belgeId) {
      await saveToDirectus({ _updateId: belgeId, paperless_id: paperlessId })
    }

    // 7. İş kaydına eski_ada/parsel yaz (yoksa)
    if (is_id && (analiz.eski_ada || analiz.eski_parsel)) {
      const isRes = await directusClient.get(`/items/kudeb_isler/${is_id}`, {
        params: { fields: 'eski_ada,eski_parsel' },
      }).catch(() => null)
      const is = isRes?.data?.data
      if (is && !is.eski_ada && analiz.eski_ada) {
        await directusClient.patch(`/items/kudeb_isler/${is_id}`, {
          eski_ada: analiz.eski_ada,
          ...(analiz.eski_parsel && !is.eski_parsel && { eski_parsel: analiz.eski_parsel }),
        }).catch(() => {})
      }
    }

    await unlink(tmpPath).catch(() => {})

    res.json({
      success: true,
      belge_id: belgeId,
      paperless_id: paperlessId,
      sayfa_sayisi,
      uyari,
      analiz,
    })

  } catch (err) {
    console.error('Upload hatası:', err)
    if (tmpPath) await unlink(tmpPath).catch(() => {})
    res.status(500).json({ error: err.message || 'Sunucu hatası.' })
  }
})

// ─── GET /belgeler/:is_no ────────────────────────────────────────────────────

router.get('/belgeler/:is_no', async (req, res) => {
  try {
    const belgeler = await getBelgelerByIsNo(req.params.is_no)
    res.json({ data: belgeler })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── DELETE /belgeler/:belge_id ──────────────────────────────────────────────

router.delete('/belgeler/:belge_id', async (req, res) => {
  try {
    await deleteBelge(req.params.belge_id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
