import { convert } from 'opendataloader-pdf'
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

/**
 * PDF veya Word dosyasından metin çıkarır.
 * OpenDataLoader PDF → Markdown çıktı → Gemini'ye daha temiz metin gider.
 *
 * @param {string} filePath  Geçici dosya yolu
 * @param {string} mimeType  MIME türü
 * @returns {{ metin: string, sayfa_sayisi: number }}
 */
export async function extractText(filePath, mimeType) {
  const tmpDir = await mkdtemp(join(tmpdir(), 'kudeb-'))

  try {
    await convert({
      input_path: [filePath],
      output_dir: tmpDir,
      format: 'markdown',  // Markdown → başlık/tablo yapısı korunur
      ocr: true,           // Taranmış PDF desteği (Türkçe dahil 80+ dil)
    })

    // Çıktı dosyası: <orijinal_ad>.md
    const files = await import('fs').then(fs =>
      fs.readdirSync(tmpDir).filter(f => f.endsWith('.md'))
    )

    if (files.length === 0) {
      return { metin: '', sayfa_sayisi: 0 }
    }

    const metin = await readFile(join(tmpDir, files[0]), 'utf-8')

    // Sayfa sayısını tahmin et (Markdown'daki --- ayırıcılardan)
    const sayfa_sayisi = (metin.match(/^---$/gm) || []).length + 1

    return { metin: temizle(metin), sayfa_sayisi }

  } finally {
    // Geçici çıktı klasörünü temizle
    await import('fs').then(fs => fs.rmSync(tmpDir, { recursive: true, force: true }))
  }
}

/**
 * Markdown metnini Gemini için temizler:
 * - Tekrarlayan boş satırları azaltır
 * - Sayfa başlıklarını/altbilgilerini kaldırır (OpenDataLoader bunu zaten yapar)
 */
function temizle(metin) {
  return metin
    .replace(/\n{3,}/g, '\n\n')  // 3+ boş satır → 2
    .trim()
}
