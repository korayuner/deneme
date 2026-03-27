import express from 'express'
import axios from 'axios'

const router = express.Router()

const BASE = 'https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api'
const IL_ID = 57 // İzmir
const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }

// ─── Cache ────────────────────────────────────────────────
const cache = new Map()

async function tkgmGet(url) {
  if (cache.has(url)) return cache.get(url)
  const res = await axios.get(url, { headers: HEADERS, timeout: 15000 })
  cache.set(url, res.data)
  return res.data
}

// ─── Fuzzy matching (n8n workflow'dan birebir alındı) ─────

function norm(str) {
  return (str || '').toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+mahallesi?$/i, '').replace(/\s+köyü?$/i, '')
    .replace(/\s+/g, ' ').trim()
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

function fuzzyBul(hedef, liste, textFn, maxDist) {
  const normHedef = norm(hedef)
  let enIyi = null, enIyiSkor = 9999

  for (const item of liste) {
    const t = norm(textFn(item))
    // Tam eşleşme
    if (t === normHedef) return { item, skor: 0, eslesen: t }
    // İçerme kontrolü
    if (t.includes(normHedef) || normHedef.includes(t)) {
      const skor = levenshtein(normHedef, t)
      if (skor < enIyiSkor) { enIyiSkor = skor; enIyi = { item, skor, eslesen: t } }
    }
    // Levenshtein
    const skor = levenshtein(normHedef, t)
    if (skor <= maxDist && skor < enIyiSkor) {
      enIyiSkor = skor
      enIyi = { item, skor, eslesen: t }
    }
  }
  return enIyi
}

// ─── Mahalle cache (ilçe bazında) ─────────────────────────
const mahalleCache = {}

// ─── Endpoint ─────────────────────────────────────────────

/**
 * GET /tkgm/parsel-koordinat
 * Query: ilce_adi, mahalle_adi (opsiyonel), ada, parsel
 * Yanıt: { lat, lon, il, ilce, mahalle, adres, duzeltme }
 */
router.get('/parsel-koordinat', async (req, res) => {
  const { ilce_adi, mahalle_adi, ada, parsel } = req.query

  if (!ilce_adi || !ada || !parsel) {
    return res.status(400).json({ error: 'ilce_adi, ada ve parsel zorunludur' })
  }

  try {
    // 1. İlçe listesi (İzmir = 57)
    const ilceResp = await tkgmGet(`${BASE}/idariYapi/ilceListe/${IL_ID}`)
    const ilceler = ilceResp.features || []

    const ilceSonuc = fuzzyBul(ilce_adi, ilceler, (f) => f.properties?.text || '', 3)
    if (!ilceSonuc) {
      return res.status(404).json({
        error: `İlçe bulunamadı: "${ilce_adi}"`,
        mevcut: ilceler.map((f) => f.properties?.text),
      })
    }

    const ilceId = ilceSonuc.item.properties.id
    const gercekIlce = ilceSonuc.item.properties.text

    // 2. Mahalle listesi (cache'li)
    if (!mahalleCache[ilceId]) {
      const mahalleResp = await tkgmGet(`${BASE}/idariYapi/mahalleListe/${ilceId}`)
      mahalleCache[ilceId] = mahalleResp.features || []
    }

    const mahalleler = mahalleCache[ilceId]
    let mahalleId, gercekMahalle, mahalleSkor = 0

    if (mahalle_adi) {
      const mahalleSonuc = fuzzyBul(mahalle_adi, mahalleler, (f) => f.properties?.text || '', 4)
      if (!mahalleSonuc) {
        return res.status(404).json({
          error: `Mahalle bulunamadı: "${mahalle_adi}" (${gercekIlce})`,
          mevcut: mahalleler.map((f) => f.properties?.text),
        })
      }
      mahalleId = mahalleSonuc.item.properties.id
      gercekMahalle = mahalleSonuc.item.properties.text
      mahalleSkor = mahalleSonuc.skor
    } else if (mahalleler.length === 1) {
      // Tek mahalle varsa direkt kullan
      mahalleId = mahalleler[0].properties.id
      gercekMahalle = mahalleler[0].properties.text
    } else {
      return res.status(400).json({
        error: 'mahalle_adi gerekli — bu ilçede birden fazla mahalle var',
        mevcut: mahalleler.map((f) => f.properties?.text),
      })
    }

    // 3. Parsel koordinatı
    const parselResp = await axios.get(
      `${BASE}/parsel/${mahalleId}/${ada}/${parsel}`,
      { headers: HEADERS, timeout: 15000 }
    )
    const parselData = parselResp.data

    if (parselData.Message) {
      return res.status(404).json({ error: parselData.Message })
    }

    const coords = parselData.geometry?.coordinates?.[0]
    if (!coords || coords.length === 0) {
      return res.status(422).json({ error: 'Koordinat geometrisi boş' })
    }

    // coords: [[lon, lat], ...] — centroid
    const lon = coords.reduce((s, p) => s + p[0], 0) / coords.length
    const lat = coords.reduce((s, p) => s + p[1], 0) / coords.length

    const duzeltme = []
    if (ilceSonuc.skor > 0) duzeltme.push(`İlçe: "${ilce_adi}" → "${gercekIlce}"`)
    if (mahalleSkor > 0)    duzeltme.push(`Mahalle: "${mahalle_adi}" → "${gercekMahalle}"`)

    return res.json({
      lat: Math.round(lat * 1e7) / 1e7,
      lon: Math.round(lon * 1e7) / 1e7,
      ada,
      parsel,
      il: 'İZMİR',
      ilce: gercekIlce,
      mahalle: gercekMahalle,
      adres: `İZMİR, ${gercekIlce}, ${gercekMahalle}, Ada: ${ada}, Parsel: ${parsel}`,
      duzeltme: duzeltme.length > 0 ? duzeltme : null,
    })
  } catch (err) {
    console.error('[TKGM] Hata:', err.message)
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Parsel bulunamadı (TKGM 404)' })
    }
    return res.status(502).json({ error: 'TKGM API hatası: ' + err.message })
  }
})

export default router
