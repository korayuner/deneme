import axios from 'axios'

const PDF_URL = import.meta.env.VITE_PDF_URL || '/api/pdf'

/**
 * Bir veya birden fazla fotoğrafı yükler.
 * @param {File[]} files
 * @param {string} is_no
 * @param {object} jobMeta  { ilce, mahalle, ada, parsel }
 * @param {string} incelemeTarihi  "2025-03-15"
 * @param {string} incelemeAciklama  "Saha İncelemesi"
 */
export async function fotografYukle(files, is_no, jobMeta = {}, incelemeTarihi = '', incelemeAciklama = '') {
  const form = new FormData()
  files.forEach(f => form.append('photos', f))
  form.append('is_no', is_no)
  if (jobMeta.ilce)     form.append('ilce', jobMeta.ilce)
  if (jobMeta.mahalle)  form.append('mahalle', jobMeta.mahalle)
  if (jobMeta.ada)      form.append('ada', jobMeta.ada)
  if (jobMeta.parsel)   form.append('parsel', jobMeta.parsel)
  if (incelemeTarihi)   form.append('inceleme_tarihi', incelemeTarihi)
  if (incelemeAciklama) form.append('inceleme_aciklama', incelemeAciklama)

  const res = await axios.post(`${PDF_URL}/photos/upload`, form, {
    timeout: 120000,
  })
  return res.data
}

/**
 * Bir işe ait fotoğrafları incelemeye göre gruplu getirir.
 */
export async function getFotograflar(is_no) {
  const res = await axios.get(`${PDF_URL}/photos/${is_no}`)
  return res.data?.data || []
}

/**
 * Directus fotoğraf kaydını siler.
 */
export async function fotografSil(foto_id) {
  await axios.delete(`${PDF_URL}/photos/${foto_id}`)
}
