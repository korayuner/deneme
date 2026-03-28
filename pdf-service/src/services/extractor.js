import { readFile } from 'fs/promises'

// Tarama PDF eşiği: bu kadardan az karakter varsa PDF görüntü tabanlıdır
const TARAMA_ESIGI = 100

/**
 * PDF veya Word dosyasından metin çıkarır.
 * PDF  → pdf-parse (gömülü metin)
 * DOCX → mammoth
 *
 * @param {string} filePath  Geçici dosya yolu
 * @param {string} mimeType  MIME türü
 * @returns {{ metin: string, sayfa_sayisi: number, tarama: boolean }}
 *   tarama=true ise PDF görüntü tabanlıdır → Gemini Vision kullanılmalı
 */
export async function extractText(filePath, mimeType) {
  if (
    mimeType === 'application/pdf' ||
    filePath.toLowerCase().endsWith('.pdf')
  ) {
    const { metin, sayfa_sayisi } = await extractPdf(filePath)
    const tarama = metin.trim().length < TARAMA_ESIGI
    if (tarama) console.log(`[OCR] Tarama PDF tespit edildi (${metin.length} karakter) — Gemini Vision devreye girecek`)
    return { metin, sayfa_sayisi, tarama }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filePath.toLowerCase().endsWith('.docx')
  ) {
    const { metin, sayfa_sayisi } = await extractDocx(filePath)
    return { metin, sayfa_sayisi, tarama: false }
  }

  // Diğer dosyalar (txt, csv vb.) — düz metin olarak oku
  const metin = await readFile(filePath, 'utf-8').catch(() => '')
  return { metin: metin.trim(), sayfa_sayisi: 1, tarama: false }
}

async function extractPdf(filePath) {
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
  const buffer = await readFile(filePath)
  const data = await pdfParse(buffer)
  return {
    metin: temizle(data.text),
    sayfa_sayisi: data.numpages || 1,
  }
}

async function extractDocx(filePath) {
  const mammoth = (await import('mammoth')).default
  const result = await mammoth.extractRawText({ path: filePath })
  return {
    metin: temizle(result.value),
    sayfa_sayisi: 1,
  }
}

function temizle(metin) {
  return metin
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
