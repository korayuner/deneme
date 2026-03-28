import axios from 'axios'

const PDF_URL = import.meta.env.VITE_PDF_URL || '/api/pdf'

/**
 * Dosyayı sadece analiz eder, kaydetmez.
 * Döner: { analiz, eslesen_isler, next_is_no }
 */
export async function yaziAnalizEt(file, onProgress) {
  const form = new FormData()
  form.append('file', file)

  const res = await axios.post(`${PDF_URL}/upload/analiz`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
    timeout: 180000,
  })
  return res.data
}

/**
 * Dosyayı Directus + Paperless'a kaydeder (belge kaydı oluşturur).
 */
export async function uploadYazi(file, isNo, isId = '', mevcutOzet = '', onProgress) {
  const form = new FormData()
  form.append('file', file)
  form.append('is_no', isNo)
  if (isId) form.append('is_id', isId)
  if (mevcutOzet) form.append('mevcut_ozet', mevcutOzet)

  const res = await axios.post(`${PDF_URL}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
    timeout: 180000,
  })
  return res.data
}

/**
 * Bir işe ait tüm belgeleri döner (eski uyumluluk — is_no bazlı).
 */
export async function getBelgelerByIsNo(isNo) {
  const res = await axios.get(`${PDF_URL}/upload/belgeler/${isNo}`)
  return res.data?.data || []
}

/**
 * Directus'taki belge kaydını siler.
 */
export async function deleteBelgePdf(belgeId) {
  await axios.delete(`${PDF_URL}/upload/belgeler/${belgeId}`)
}

/**
 * TKGM Parsel Sorgu API'si üzerinden ada/parsel koordinatını bulur.
 */
export async function tkgmKoordinatBul({ ilce_adi, mahalle_adi, ada, parsel }) {
  const params = new URLSearchParams()
  if (ilce_adi)    params.append('ilce_adi', ilce_adi)
  if (mahalle_adi) params.append('mahalle_adi', mahalle_adi)
  if (ada)         params.append('ada', ada)
  if (parsel)      params.append('parsel', parsel)

  const res = await axios.get(`${PDF_URL}/tkgm/parsel-koordinat?${params}`, { timeout: 30000 })
  return res.data
}
