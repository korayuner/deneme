import axios from 'axios'
import { readFile } from 'fs/promises'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// 60 saniyelik prompt cache
let _promptCache = null
let _promptCacheTime = 0

const directus = axios.create({
  baseURL: process.env.DIRECTUS_URL || 'http://directus:8055',
  headers: { Authorization: `Bearer ${process.env.DIRECTUS_TOKEN}` },
})

/**
 * kudeb_ayarlar tablosundan prompt + model + temperature + api_keys okur.
 * 60 saniye cache.
 */
async function getAyarlar() {
  const now = Date.now()
  if (_promptCache && now - _promptCacheTime < 60_000) return _promptCache

  try {
    const res = await directus.get('/items/kudeb_ayarlar', {
      params: { limit: -1, fields: 'anahtar,deger' },
    })
    const rows = res.data?.data || []
    const obj = Object.fromEntries(rows.map((r) => [r.anahtar, r.deger]))
    _promptCache = obj
    _promptCacheTime = now
    return obj
  } catch (err) {
    console.warn('Ayarlar okunamadı, varsayılan kullanılıyor:', err.message)
    return {}
  }
}

/**
 * API key + model slotları: önce DB, yoksa env.
 */
async function getApiSlots() {
  const ayarlar = await getAyarlar()

  // DB'den
  if (ayarlar.gemini_api_keys) {
    const keys = ayarlar.gemini_api_keys.split(',').map((s) => s.trim()).filter(Boolean)
    const model = ayarlar.gemini_model || 'gemini-1.5-flash'
    return keys.map((key) => ({ key, model }))
  }

  // ENV'den fallback
  const keys = (process.env.GEMINI_API_KEYS || '').split(',').map((s) => s.trim()).filter(Boolean)
  const models = (process.env.GEMINI_MODELS || 'gemini-2.5-flash').split(',').map((s) => s.trim())
  return keys.map((key, i) => ({ key, model: models[i] || models[0] }))
}

/**
 * Gemini API'ye istek atar (metin tabanlı). Birden fazla anahtar varsa sırayla dener.
 */
export async function callGemini(prompt) {
  const ayarlar = await getAyarlar()
  const temperature = parseFloat(ayarlar.gemini_temperature || '0.2')
  const slots = await getApiSlots()

  if (slots.length === 0) throw new Error('Gemini API anahtarı tanımlı değil. Ayarlar > Yapay Zeka bölümünden ekleyin.')

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: 8192 },
  }

  let lastError = ''
  for (const { key, model } of slots) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${key}`
      const res = await axios.post(url, payload, { timeout: 90000 })
      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (text) return text
    } catch (err) {
      lastError = `${model}: ${err.response?.status || err.message}`
      console.warn(`Gemini slot başarısız (${model}):`, lastError)
    }
  }
  throw new Error(`Hiçbir Gemini modeli yanıt vermedi. Son hata: ${lastError}`)
}

/**
 * Tarama PDF'i Gemini Vision ile analiz eder.
 * Dosya base64 olarak inline_data şeklinde gönderilir — metin çıkarmaya gerek yok.
 * Gemini 2.5 Flash, application/pdf'i doğrudan okuyabiliyor.
 *
 * @param {string} filePath  Geçici dosya yolu
 * @param {string} mimeType  'application/pdf'
 * @param {string} mevcutOzet  Mevcut iş özeti (harmanlama için)
 */
export async function analyzeFileWithGemini(filePath, mimeType = 'application/pdf', mevcutOzet = '') {
  const ayarlar = await getAyarlar()
  const temperature = parseFloat(ayarlar.gemini_temperature || '0.2')
  const slots = await getApiSlots()

  if (slots.length === 0) throw new Error('Gemini API anahtarı tanımlı değil.')

  const harmanlamaTalimati = mevcutOzet
    ? `BAĞLAM (İŞİN GEÇMİŞİ): "${mevcutOzet}"\n\nBu geçmiş ile ekteki yeni belgeyi harmanlayarak bütünleşik bir ÖZET yaz.`
    : `Belgenin konusunu, talebini ve sonucunu teknik bir dille özetle.`

  // Prompt: BELGE_METNI yerine "ekteki belgeyi oku" talimatı
  const promptSablon = ayarlar.gemini_prompt || VARSAYILAN_PROMPT
  const prompt = promptSablon
    .replace('{BELGE_METNI}', 'NOT: Bu belge tarama (görüntü) PDF\'dir. Belge içeriğini doğrudan dosyadan oku ve analiz et.')
    .replace('{HARMANLAMA_TALIMATI}', harmanlamaTalimati)

  // PDF'i base64'e çevir (max 20MB inline_data limiti)
  const fileBuffer = await readFile(filePath)
  const base64Data = fileBuffer.toString('base64')

  const payload = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt },
      ],
    }],
    generationConfig: { temperature, maxOutputTokens: 8192 },
  }

  let lastError = ''
  for (const { key, model } of slots) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${key}`
      const res = await axios.post(url, payload, { timeout: 120000 })
      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (text) {
        console.log(`[OCR] Gemini Vision analizi tamamlandı (${model})`)
        return parseResponse(text)
      }
    } catch (err) {
      lastError = `${model}: ${err.response?.status || err.message}`
      console.warn(`Gemini Vision slot başarısız (${model}):`, lastError)
    }
  }
  throw new Error(`Gemini Vision hiçbir modelde çalışmadı. Son hata: ${lastError}`)
}

/**
 * Belge metnini analiz eder, yapılandırılmış obje döner.
 * Prompt DB'den okunur, yoksa varsayılan kullanılır.
 */
export async function analyzeWithGemini(ocrMetni, mevcutOzet = '') {
  const ayarlar = await getAyarlar()

  const harmanlamaTalimati = mevcutOzet
    ? `BAĞLAM (İŞİN GEÇMİŞİ): "${mevcutOzet}"\n\nBu geçmiş ile aşağıdaki yeni belgeyi harmanlayarak bütünleşik bir ÖZET yaz.`
    : `Belgenin konusunu, talebini ve sonucunu teknik bir dille özetle.`

  let prompt = ayarlar.gemini_prompt || VARSAYILAN_PROMPT

  // Yer tutucuları doldur
  prompt = prompt
    .replace('{BELGE_METNI}', ocrMetni.slice(0, 8000))
    .replace('{HARMANLAMA_TALIMATI}', harmanlamaTalimati)

  const yanit = await callGemini(prompt)
  return parseResponse(yanit)
}

/**
 * Gemini'nin düz metin yanıtını parse eder.
 * eski_ada / eski_parsel alanlarını da destekler.
 */
function parseResponse(text) {
  text = text.replace(/\*\*/g, '').replace(/##/g, '').replace(/#/g, '')

  const fields = {
    sayi:         'SAYI:',
    ilce:         'İLÇE:',
    mahalle:      'MAHALLE:',
    ada:          'ADA:',
    parsel:       'PARSEL:',
    eski_ada:     'ESKİ ADA:',
    eski_parsel:  'ESKİ PARSEL:',
    kimden:       'KİMDEN:',
    kime:         'KİME:',
    tarih:        'TARİH:',
    konu:         'KONU:',
    vade_tarihi:  'VADE TARİHİ:',
    ekler:        'EKLER:',
    ozet:         'ÖZET:',
  }

  const result = {}
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    for (const [key, label] of Object.entries(fields)) {
      if (trimmed.toUpperCase().startsWith(label)) {
        result[key] = trimmed.slice(label.length).trim()
        break
      }
    }
  }

  // Ada içindeki eski tapu parantezini çıkar: "111 ada (e:542)" → ada=111, eski_ada=542
  if (result.ada) {
    const match = result.ada.match(/^(\d+)\s*[\(\[]\s*[eE]:?(\d+)\s*[\)\]]/)
    if (match) {
      result.eski_ada = result.eski_ada || match[2]
      result.ada = match[1]
    }
    result.ada = result.ada.replace(/[^\d]/g, '') || result.ada
  }

  // Boş string → undefined
  for (const k of Object.keys(result)) {
    if (result[k] === '' || result[k] === '-' || result[k] === 'boş') {
      delete result[k]
    }
  }

  // Belge türü tahmini
  const kimden = (result.kimden || '').toUpperCase()
  result.tur = (kimden.includes('KUDEB') || kimden.includes('KORUMA') || kimden.includes('BELEDİYE'))
    ? 'Giden' : 'Gelen'

  return result
}

// Varsayılan prompt (DB'de yoksa)
const VARSAYILAN_PROMPT = `ROL: İzmir Büyükşehir Belediyesi KUDEB biriminde çalışan, eski eserler ve imar mevzuatı uzmanısın.

GÖREV: Aşağıdaki belgeyi analiz et ve verileri istenen formatta döndür.

{HARMANLAMA_TALIMATI}

ÖNEMLİ KURALLAR:
1. Markdown (**, ##) kullanma — sadece düz metin.
2. Bilgi bulamazsan o alanı boş bırak, uydurma.
3. Ada/parsel bilgisinde parantez içi eski tapu ifadelerini (örn: "111 ada (e:542)") AYIR: ADA: 111 ve ESKİ ADA: 542 olarak yaz.
4. Aşağıdaki başlık etiketlerini değiştirme.

İSTENEN FORMAT (her alan ayrı satırda):
SAYI: [evrak sayısı]
İLÇE: [ilçe adı]
MAHALLE: [mahalle adı]
ADA: [ada no — sadece sayı, parantez yok]
PARSEL: [parsel no]
ESKİ ADA: [eski ada no, varsa]
ESKİ PARSEL: [eski parsel no, varsa]
KİMDEN: [gönderen kurum/kişi]
KİME: [alıcı]
TARİH: [GG.AA.YYYY]
KONU: [konu başlığı]
VADE TARİHİ: [cevap son tarihi, yoksa boş]
EKLER: [eklerin listesi]
ÖZET: [teknik özet]

BELGE İÇERİĞİ:
---
{BELGE_METNI}
---`
