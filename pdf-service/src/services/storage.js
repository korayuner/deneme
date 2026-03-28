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

// ─── Directus: Belge kaydı ───────────────────────────────────────────────────

/**
 * kudeb_belgeler tablosuna yeni kayıt ekler.
 * isIds verilirse junction tablosuna da bağlar.
 * isIds boşsa beklemede=true olarak işaretlenir.
 *
 * @param {object} belgeData   kudeb_belgeler alanları
 * @param {number[]} isIds     bağlanacak iş ID'leri
 * @param {string|null} uyari  fuzzy match uyarısı
 * @returns {number|null}      oluşturulan belge ID
 */
export async function saveToDirectus(belgeData, isIds = [], uyari = null) {
  // Eğer sadece güncelleme yapılıyorsa (belgeData.id varsa)
  if (belgeData._updateId) {
    const id = belgeData._updateId
    const { _updateId, ...data } = belgeData
    await directus.patch(`/items/kudeb_belgeler/${id}`, data)
    return id
  }

  const beklemede = isIds.length === 0

  const res = await directus.post('/items/kudeb_belgeler', {
    ...belgeData,
    beklemede,
  })
  const belgeId = res.data?.data?.id
  if (!belgeId) return null

  // Junction kayıtları
  if (isIds.length > 0) {
    await Promise.all(
      isIds.map((is_id) =>
        directus.post('/items/kudeb_belge_isler', {
          belge_id: belgeId,
          is_id,
          uyari: uyari || null,
        }).catch((err) => console.warn('Junction kayıt hatası:', err.message))
      )
    )
  }

  return belgeId
}

/**
 * Belgeyi Directus'tan siler (junction kayıtlarını da siler).
 */
export async function deleteBelge(id) {
  // Junction kayıtlarını sil
  const links = await directus.get('/items/kudeb_belge_isler', {
    params: { filter: JSON.stringify({ belge_id: { _eq: id } }), fields: 'id' },
  })
  if (links.data?.data?.length > 0) {
    await directus.delete('/items/kudeb_belge_isler', {
      data: links.data.data.map((l) => l.id),
    })
  }
  await directus.delete(`/items/kudeb_belgeler/${id}`)
}

/**
 * Eski uyumluluk: is_no ile belge listesi (artık junction üzerinden).
 */
export async function getBelgelerByIsNo(is_no) {
  // Önce is_no'ya karşılık gelen işi bul
  const isRes = await directus.get('/items/kudeb_isler', {
    params: { filter: JSON.stringify({ is_no: { _eq: is_no } }), fields: 'id', limit: 1 },
  })
  const is = isRes.data?.data?.[0]
  if (!is) return []

  // Junction'dan belge ID'leri
  const jRes = await directus.get('/items/kudeb_belge_isler', {
    params: { filter: JSON.stringify({ is_id: { _eq: is.id } }), fields: 'belge_id,uyari', limit: 200 },
  })
  const links = jRes.data?.data || []
  if (links.length === 0) return []

  const belgeIds = links.map((l) => l.belge_id)
  const bRes = await directus.get('/items/kudeb_belgeler', {
    params: {
      filter: JSON.stringify({ id: { _in: belgeIds } }),
      sort: '-tarih',
      fields: 'id,dosya_adi,tur,kimden,kime,tarih,sayi,konu,ozet,paperless_id,beklemede',
    },
  })

  const uyariMap = {}
  links.forEach((l) => { uyariMap[l.belge_id] = l.uyari })
  return bRes.data?.data?.map((b) => ({ ...b, uyari: uyariMap[b.id] || null })) || []
}

// ─── Paperless-ngx ──────────────────────────────────────────────────────────

/**
 * Paperless-ngx'e PDF yükler.
 * @returns {number|null} Paperless doküman task ID
 */
export async function saveToPaperless(filePath, fileName, meta = {}) {
  try {
    const form = new FormData()
    form.append('document', createReadStream(filePath), fileName)

    if (meta.tarih)    form.append('created', normalizeDate(meta.tarih))
    if (fileName)      form.append('title', fileName)

    // Etiket: is_no
    if (meta.is_no) {
      const tagId = await getOrCreateTag(meta.is_no)
      if (tagId) form.append('tags', String(tagId))
    }

    // Custom fields
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
    return res.data?.id || res.data?.task_id || null

  } catch (err) {
    console.warn('Paperless yükleme hatası:', err.response?.data || err.message)
    return null
  }
}

async function getOrCreateTag(is_no) {
  if (!is_no) return null
  try {
    const res = await paperless.get('/api/tags/', { params: { name: is_no } })
    if (res.data.results?.length > 0) return res.data.results[0].id
    const create = await paperless.post('/api/tags/', { name: is_no })
    return create.data?.id || null
  } catch {
    return null
  }
}

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

function normalizeDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split('.')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return dateStr
}
