import axios from 'axios'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Ayarlar'dan API anahtarı + model çiftlerini okur.
 * Excel VBA'daki çoklu-yedek sistemiyle aynı mantık.
 *
 * Env değişkenleri (virgülle ayrılmış listeler):
 *   GEMINI_API_KEYS  = "key1,key2,key3"
 *   GEMINI_MODELS    = "gemini-2.5-flash,gemini-1.5-pro"
 */
function getApiSlots() {
  const keys   = (process.env.GEMINI_API_KEYS || '').split(',').map(s => s.trim()).filter(Boolean)
  const models = (process.env.GEMINI_MODELS   || 'gemini-2.5-flash').split(',').map(s => s.trim())

  return keys.map((key, i) => ({
    key,
    model: models[i] || models[0],
  }))
}

/**
 * Gemini API'ye istek atar. Birden fazla anahtar varsa sırayla dener.
 * @param {string} prompt
 * @returns {string} Ham metin yanıtı
 */
export async function callGemini(prompt) {
  const slots = getApiSlots()
  if (slots.length === 0) throw new Error('GEMINI_API_KEYS env değişkeni tanımlı değil.')

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
  }

  let lastError = ''
  for (const { key, model } of slots) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${key}`
      const res = await axios.post(url, payload, { timeout: 60000 })
      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (text) return text
    } catch (err) {
      lastError = `${model}: ${err.response?.status || err.message}`
    }
  }
  throw new Error(`Hiçbir Gemini modeli yanıt vermedi. Son hata: ${lastError}`)
}

/**
 * OCR metnini analiz eder, yapılandırılmış JSON döner.
 * Excel VBA'daki OlusturAkilliPrompt + ParseGeminiResponseToForm mantığı.
 *
 * @param {string} ocrMetni   Çıkarılan metin
 * @param {string} mevcutOzet Mevcut iş özeti (harmanlama için)
 * @returns {object} Ayrıştırılmış alanlar
 */
export async function analyzeWithGemini(ocrMetni, mevcutOzet = '') {
  const harmanlamaTalimati = mevcutOzet
    ? `BAĞLAM (İŞİN GEÇMİŞİ): "${mevcutOzet}"\n\n` +
      `Bu geçmiş ile aşağıdaki yeni belgeyi harmanlayarak bütünleşik bir ÖZET yaz.`
    : `Belgenin konusunu, talebini ve sonucunu teknik bir dille özetle.`

  const prompt = `ROL: İzmir Büyükşehir Belediyesi KUDEB biriminde çalışan, eski eserler ve imar mevzuatı uzmanısın.

GÖREV: Aşağıdaki belgeyi analiz et ve verileri istenen formatta döndür.

${harmanlamaTalimati}

ÖNEMLİ KURALLAR:
1. Markdown (**, ##) kullanma — sadece düz metin.
2. Bilgi bulamazsan o alanı boş bırak, uydurma.
3. Aşağıdaki başlık etiketlerini değiştirme.

İSTENEN FORMAT (her alan ayrı satırda):
SAYI: [evrak sayısı]
İLÇE: [ilçe adı]
MAHALLE: [mahalle adı]
ADA: [ada no]
PARSEL: [parsel no]
KİMDEN: [gönderen kurum/kişi]
KİME: [alıcı]
TARİH: [GG.AA.YYYY]
KONU: [konu başlığı]
VADE TARİHİ: [cevap son tarihi, yoksa boş]
EKLER: [eklerin listesi]
ÖZET: [yukarıdaki talimata göre teknik özet]

BELGE İÇERİĞİ:
---
${ocrMetni.slice(0, 8000)}
---`

  const yanit = await callGemini(prompt)
  return parseResponse(yanit)
}

/**
 * Gemini'nin düz metin yanıtını key:value objesine dönüştürür.
 * Excel VBA'daki ParseGeminiResponseToForm + TemizleDeger mantığı.
 */
function parseResponse(text) {
  // Markdown kalıntılarını temizle
  text = text.replace(/\*\*/g, '').replace(/##/g, '').replace(/#/g, '')

  const fields = {
    sayi:         'SAYI:',
    ilce:         'İLÇE:',
    mahalle:      'MAHALLE:',
    ada:          'ADA:',
    parsel:       'PARSEL:',
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
      if (trimmed.startsWith(label)) {
        result[key] = trimmed.slice(label.length).trim()
        break
      }
    }
  }

  // Tür tahmini: kimden KUDEB/Koruma ise Giden, aksi halde Gelen
  const kimden = (result.kimden || '').toUpperCase()
  result.tur = (kimden.includes('KUDEB') || kimden.includes('KORUMA')) ? 'Giden' : 'Gelen'

  return result
}
