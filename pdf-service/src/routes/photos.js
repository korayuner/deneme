import express from 'express'
import multer from 'multer'
import { unlink } from 'fs/promises'
import {
  getVeyaOlusturIsKlasoru,
  getVeyaOlusturIncelemeKlasoru,
  fotografYukle,
  tumIncelmeleriGetir,
} from '../services/drive.js'
import axios from 'axios'

const router = express.Router()

const upload = multer({
  dest: '/tmp/',
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB per photo
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'))
  },
})

const directus = axios.create({
  baseURL: process.env.DIRECTUS_URL || 'http://directus:8055',
  headers: { Authorization: `Bearer ${process.env.DIRECTUS_TOKEN}` },
})

/**
 * POST /photos/upload
 * Body (multipart/form-data):
 *   photos[]          — bir veya birden fazla fotoğraf
 *   is_no             — "2025-001"
 *   ilce, mahalle, ada, parsel  — klasör adı için
 *   inceleme_tarihi   — "2025-03-15"  (opsiyonel, bugün kullanılır)
 *   inceleme_aciklama — "Saha İncelemesi"  (opsiyonel)
 */
router.post('/upload', upload.array('photos', 20), async (req, res) => {
  const tmpPaths = (req.files || []).map(f => f.path)

  try {
    const { is_no, ilce, mahalle, ada, parsel, inceleme_tarihi, inceleme_aciklama } = req.body

    if (!req.files?.length) return res.status(400).json({ error: 'Fotoğraf bulunamadı.' })
    if (!is_no)            return res.status(400).json({ error: 'is_no zorunlu.' })

    // 1. Drive klasör yapısını oluştur / bul
    const { fotograflarFolderId } = await getVeyaOlusturIsKlasoru(is_no, { ilce, mahalle, ada, parsel })

    // 2. İnceleme alt klasörünü oluştur / bul
    const incelemeKlasorId = await getVeyaOlusturIncelemeKlasoru(
      fotograflarFolderId,
      inceleme_tarihi,
      inceleme_aciklama || 'İnceleme',
    )

    // 3. Fotoğrafları Drive'a yükle
    const yuklenenler = await Promise.all(
      req.files.map(async (file) => {
        const driveFile = await fotografYukle(
          file.path,
          file.originalname,
          incelemeKlasorId,
          file.mimetype,
        )
        return {
          drive_file_id: driveFile.id,
          drive_klasor_id: incelemeKlasorId,
          dosya_adi: file.originalname,
          web_view_link: driveFile.webViewLink,
          thumbnail_link: driveFile.thumbnailLink,
          boyut: driveFile.size,
        }
      })
    )

    // 4. Directus kudeb_fotograflar tablosuna kaydet
    const kayitlar = await Promise.all(
      yuklenenler.map(f =>
        directus.post('/items/kudeb_fotograflar', {
          is_no,
          drive_file_id:    f.drive_file_id,
          drive_klasor_id:  f.drive_klasor_id,
          dosya_adi:        f.dosya_adi,
          web_view_link:    f.web_view_link,
          thumbnail_link:   f.thumbnail_link,
          boyut:            f.boyut,
          inceleme_tarihi:  inceleme_tarihi || new Date().toISOString().split('T')[0],
          inceleme_aciklama: inceleme_aciklama || 'İnceleme',
        }).then(r => r.data.data)
      )
    )

    // 5. Geçici dosyaları sil
    await Promise.all(tmpPaths.map(p => unlink(p).catch(() => {})))

    res.json({
      success: true,
      yuklenen_sayisi: yuklenenler.length,
      kayitlar,
    })

  } catch (err) {
    console.error('Fotoğraf yükleme hatası:', err)
    await Promise.all(tmpPaths.map(p => unlink(p).catch(() => {})))
    res.status(500).json({ error: err.message || 'Sunucu hatası.' })
  }
})

/**
 * GET /photos/:is_no
 * Bir işe ait tüm fotoğrafları inceleme bazında gruplu döner.
 * Directus'tan çeker (Drive'a istek atmaz, hızlı).
 */
router.get('/:is_no', async (req, res) => {
  try {
    const { is_no } = req.params

    const r = await directus.get('/items/kudeb_fotograflar', {
      params: {
        filter: JSON.stringify({ is_no: { _eq: is_no } }),
        sort: 'inceleme_tarihi,date_created',
        fields: 'id,is_no,drive_file_id,drive_klasor_id,dosya_adi,web_view_link,thumbnail_link,boyut,inceleme_tarihi,inceleme_aciklama,date_created',
      },
    })

    const fotograflar = r.data?.data || []

    // İncelemeye göre grupla
    const gruplar = {}
    for (const f of fotograflar) {
      const anahtar = `${f.inceleme_tarihi}_${f.inceleme_aciklama}`
      if (!gruplar[anahtar]) {
        gruplar[anahtar] = {
          tarih: f.inceleme_tarihi,
          aciklama: f.inceleme_aciklama,
          fotograflar: [],
        }
      }
      gruplar[anahtar].fotograflar.push(f)
    }

    res.json({ data: Object.values(gruplar) })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /photos/:foto_id
 * Directus kaydını siler (Drive'daki dosya kalır — kasıtlı, geri dönüş için)
 */
router.delete('/:foto_id', async (req, res) => {
  try {
    await directus.delete(`/items/kudeb_fotograflar/${req.params.foto_id}`)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
