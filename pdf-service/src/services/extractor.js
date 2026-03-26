import { readFile } from 'fs/promises'

/**
 * PDF veya Word dosyasından metin çıkarır.
 * PDF  → pdf-parse
 * DOCX → mammoth
 *
 * @param {string} filePath  Geçici dosya yolu
 * @param {string} mimeType  MIME türü
 * @returns {{ metin: string, sayfa_sayisi: number }}
 */
export async function extractText(filePath, mimeType) {
  if (
    mimeType === 'application/pdf' ||
    filePath.toLowerCase().endsWith('.pdf')
  ) {
    return extractPdf(filePath)
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filePath.toLowerCase().endsWith('.docx')
  ) {
    return extractDocx(filePath)
  }

  // Diğer dosyalar (txt, csv vb.) — düz metin olarak oku
  const metin = await readFile(filePath, 'utf-8').catch(() => '')
  return { metin: metin.trim(), sayfa_sayisi: 1 }
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
