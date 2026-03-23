import axios from 'axios'

const PDF_URL = import.meta.env.VITE_PDF_URL || '/api/pdf'

/**
 * PDF veya Word dosyasını pdf-service'e yükler.
 * Servis: metin çıkarır → Gemini analiz yapar → Directus + Paperless'a kaydeder.
 *
 * @param {File}   file        Yüklenecek dosya
 * @param {string} is_no       İş numarası (örn: "2025-001")
 * @param {string} is_id       Directus job UUID
 * @param {string} mevcutOzet  Mevcut özet (Gemini harmonlaması için)
 * @param {function} onProgress İlerleme callback'i (0-100)
 * @returns {object} { analiz, belge_id, paperless_id, sayfa_sayisi }
 */
export async function uploadAndAnalyze(file, is_no, is_id = '', mevcutOzet = '', onProgress) {
  const form = new FormData()
  form.append('file', file)
  form.append('is_no', is_no)
  if (is_id)       form.append('is_id', is_id)
  if (mevcutOzet)  form.append('mevcut_ozet', mevcutOzet)

  const res = await axios.post(`${PDF_URL}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
    timeout: 180000, // 3 dk — büyük PDF'ler için
  })

  return res.data
}

/**
 * Bir işe ait tüm belgeleri Directus'tan döner (is_no bazlı izolasyon).
 */
export async function getBelgelerByIsNo(is_no) {
  const res = await axios.get(`${PDF_URL}/upload/belgeler/${is_no}`)
  return res.data?.data || []
}

/**
 * Directus'taki belge kaydını siler.
 */
export async function deleteBelge(belge_id) {
  await axios.delete(`${PDF_URL}/upload/belgeler/${belge_id}`)
}
