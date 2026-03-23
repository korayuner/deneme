import axios from 'axios'
import FormData from 'form-data'
import { createReadStream } from 'fs'

const directus = axios.create({
  baseURL: process.env.DIRECTUS_URL || 'http://directus:8055',
  headers: { Authorization: `Bearer ${process.env.DIRECTUS_TOKEN}` },
})

const paperless = axios.create({
  baseURL: process.env.PAPERLESS_URL || 'http://paperless-ngx:8000',
  headers: { Authorization: `Token ${process.env.PAPERLESS_TOKEN}` },
})

// ─── Directus ───────────────────────────────────────────────────────────────

/**
 * kudeb_belgeler tablosuna yeni kayıt ekler.
 * Eğer id verilirse PATCH (güncelleme) yapar.
 */
export async function saveToDirectus(data, id = null) {
  if (id) {
    await directus.patch(`/items/kudeb_belgeler/${id}`, data)
    return id
  }
  const res = await directus.post('/items/kudeb_belgeler', data)
  return res.data?.data?.id || null
}

/**
 * Bir işe ait tüm belgeleri döner.
 */
export async function getBelgelerByIsNo(is_no) {
  const res = await directus.get('/items/kudeb_belgeler', {
    params: {
      filter: JSON.stringify({ is_no: { _eq: is_no } }),
      sort: 'date_created',
      fields: 'id,is_no,paperless_id,dosya_adi,tur,kimden,kime,tarih,konu,ozet,date_created',
    },
  })
  return res.data?.data || []
}

/**
 * Belgeyi Directus'tan siler.
 */
export async function deleteBelge(id) {
  await directus.delete(`/items/kudeb_belgeler/${id}`)
}

// ─── Paperless-ngx ──────────────────────────────────────────────────────────

/**
 * Paperless-ngx'e PDF yükler.
 * is_no etiketiyle etiketler → belge izolasyonu sağlanır.
 *
 * @returns {number|null} Paperless doküman ID
 */
export async function saveToPaperless(filePath, fileName, meta = {}) {
  try {
    const form = new FormData()
    form.append('document', createReadStream(filePath), fileName)

    if (meta.tarih)  form.append('created', normalizeDate(meta.tarih))
    if (fileName)    form.append('title', fileName)

    // is_no etiketini bul veya oluştur
    const tagId = await getOrCreateTag(meta.is_no)
    if (tagId) form.append('tags', String(tagId))

    // Custom fields (ada, parsel, ilce, mahalle)
    const customFields = buildCustomFields(meta)
    if (customFields.length > 0) {
      form.append('custom_fields', JSON.stringify(customFields))
    }

    const res = await axios.post(
      `${process.env.PAPERLESS_URL || 'http://paperless-ngx:8000'}/api/documents/post_document/`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Token ${process.env.PAPERLESS_TOKEN}`,
        },
        timeout: 120000,
      }
    )

    // Paperless yüklemeyi asenkron yapar, hemen ID dönmez.
    // Birkaç saniye sonra sorgulamak gerekir — şimdilik task ID'yi döneriz.
    return res.data?.id || res.data?.task_id || null

  } catch (err) {
    // Paperless hatası upload'ı engellemez, sadece loglanır
    console.warn('Paperless yükleme hatası:', err.response?.data || err.message)
    return null
  }
}

async function getOrCreateTag(is_no) {
  if (!is_no) return null
  try {
    // Varsa bul
    const res = await paperless.get('/api/tags/', { params: { name: is_no } })
    if (res.data.results?.length > 0) return res.data.results[0].id

    // Yoksa oluştur
    const create = await paperless.post('/api/tags/', { name: is_no })
    return create.data?.id || null
  } catch {
    return null
  }
}

// Paperless custom field ID'leri (kuruluma göre değişebilir, env'den alınır)
const CF = {
  ada:     parseInt(process.env.PAPERLESS_CF_ADA     || '5'),
  parsel:  parseInt(process.env.PAPERLESS_CF_PARSEL  || '6'),
  ilce:    parseInt(process.env.PAPERLESS_CF_ILCE    || '3'),
  mahalle: parseInt(process.env.PAPERLESS_CF_MAHALLE || '4'),
}

function buildCustomFields(meta) {
  const fields = []
  if (meta.ada)     fields.push({ field: CF.ada,     value: meta.ada })
  if (meta.parsel)  fields.push({ field: CF.parsel,  value: meta.parsel })
  if (meta.ilce)    fields.push({ field: CF.ilce,    value: meta.ilce })
  if (meta.mahalle) fields.push({ field: CF.mahalle, value: meta.mahalle })
  return fields
}

// "15.03.2025" → "2025-03-15"
function normalizeDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split('.')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return dateStr
}
