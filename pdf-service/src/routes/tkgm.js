import express from 'express'
import axios from 'axios'

const router = express.Router()

const TKGM = 'https://parselsorgu.tkgm.gov.tr/api/sorgu'

// Simple in-process cache (il/ilce/mahalle listeleri çok sık değişmez)
const cache = new Map()

const tkgmHeaders = {
  'User-Agent': 'Mozilla/5.0 (compatible; KUDEB/1.0)',
  'Accept': 'application/json',
  'Referer': 'https://parselsorgu.tkgm.gov.tr/',
}

async function tkgmGet(url) {
  if (cache.has(url)) return cache.get(url)
  const res = await axios.get(url, { headers: tkgmHeaders, timeout: 15000 })
  cache.set(url, res.data)
  return res.data
}

// Metin normalleştirme: büyük harf + Türkçe karakter dönüşümü
function normalize(str) {
  if (!str) return ''
  return str
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .replace(/Ğ/g, 'G')
    .replace(/Ş/g, 'S')
    .replace(/Ç/g, 'C')
    .replace(/Ö/g, 'O')
    .replace(/Ü/g, 'U')
    .trim()
}

// Bir listedeki en iyi eşleşmeyi bul (id ve ad alanları TKGM standardı)
function enIyiEslesme(liste, aranan) {
  const norm = normalize(aranan)
  // Tam eşleşme önce
  let bulunan = liste.find((x) => normalize(x.ad) === norm)
  if (!bulunan) {
    // İçerme kontrolü
    bulunan = liste.find((x) => normalize(x.ad).includes(norm) || norm.includes(normalize(x.ad)))
  }
  return bulunan || null
}

// Polygon ya da MultiPolygon koordinatlarından ağırlıksız merkez (centroid)
function centroid(geometry) {
  let ring
  if (geometry.type === 'Polygon') {
    ring = geometry.coordinates[0]
  } else if (geometry.type === 'MultiPolygon') {
    // En büyük halkayı al
    ring = geometry.coordinates.reduce((prev, cur) =>
      cur[0].length > prev[0].length ? cur : prev
    )[0]
  } else {
    return null
  }

  // TKGM koordinatlar bazen [lon, lat] bazen [lat, lon] sırasında gelebilir.
  // Türkiye için lat: 36-42, lon: 26-45 aralığındadır.
  // İlk eleman bu aralıkta değilse ters çevir.
  const [x0, y0] = ring[0]
  const latFirst = x0 >= 36 && x0 <= 42
  const n = ring.length

  let sumA = 0, sumB = 0
  for (const [a, b] of ring) {
    sumA += a
    sumB += b
  }

  const avg1 = sumA / n
  const avg2 = sumB / n

  if (latFirst) return { lat: avg1, lon: avg2 }
  return { lat: avg2, lon: avg1 }
}

/**
 * GET /tkgm/parsel-koordinat
 * Query: ilce_adi, mahalle_adi (opsiyonel), ada, parsel
 * Yanıt: { lat, lon, ada, parsel, adres }
 */
router.get('/parsel-koordinat', async (req, res) => {
  const { ilce_adi, mahalle_adi, ada, parsel } = req.query

  if (!ilce_adi || !ada || !parsel) {
    return res.status(400).json({ error: 'ilce_adi, ada ve parsel zorunludur' })
  }

  try {
    // 1. İl listesi — İzmir = 35 (sabit, ama yine de doğrulayalım)
    const ilListesi = await tkgmGet(`${TKGM}/il-listesi`)
    const izmir = enIyiEslesme(ilListesi, 'İZMİR') || enIyiEslesme(ilListesi, 'IZMIR')
    if (!izmir) return res.status(404).json({ error: 'İzmir ili bulunamadı' })

    // 2. İlçe listesi
    const ilceListesi = await tkgmGet(`${TKGM}/ilce-listesi/${izmir.id}`)
    const ilce = enIyiEslesme(ilceListesi, ilce_adi)
    if (!ilce) {
      return res.status(404).json({
        error: `İlçe bulunamadı: ${ilce_adi}`,
        mevcut: ilceListesi.map((x) => x.ad),
      })
    }

    // 3. Mahalle listesi
    const mahalleListesi = await tkgmGet(`${TKGM}/mahalle-koy-listesi/${ilce.id}`)

    let mahalle = null
    if (mahalle_adi) {
      mahalle = enIyiEslesme(mahalleListesi, mahalle_adi)
    }
    // mahalle bulunamazsa ilk mahalleyi deneme — küçük ilçelerde tek mahalle olabilir
    if (!mahalle) {
      if (mahalleListesi.length === 1) {
        mahalle = mahalleListesi[0]
      } else {
        return res.status(404).json({
          error: `Mahalle bulunamadı: ${mahalle_adi}`,
          mevcut: mahalleListesi.map((x) => x.ad),
        })
      }
    }

    // 4. Parsel sorgusu
    const parselUrl = `${TKGM}/parsel-sorgu/${izmir.id}/${ilce.id}/${mahalle.id}/${ada}/${parsel}`
    const parselData = await axios.get(parselUrl, { headers: tkgmHeaders, timeout: 15000 })
    const data = parselData.data

    // TKGM yanıt formatı: GeoJSON FeatureCollection veya { features: [...] }
    let feature = null
    if (data?.type === 'FeatureCollection' && data.features?.length > 0) {
      feature = data.features[0]
    } else if (Array.isArray(data?.features) && data.features.length > 0) {
      feature = data.features[0]
    } else if (data?.geometry) {
      feature = data
    }

    if (!feature?.geometry) {
      return res.status(404).json({ error: 'Parsel geometrisi bulunamadı', raw: data })
    }

    const merkez = centroid(feature.geometry)
    if (!merkez) {
      return res.status(422).json({ error: 'Koordinat hesaplanamadı', geometry: feature.geometry })
    }

    const adres = [
      feature.properties?.il_adi || 'İZMİR',
      mahalle.ad,
      `Ada: ${ada}`,
      `Parsel: ${parsel}`,
    ].join(', ')

    return res.json({
      lat: Math.round(merkez.lat * 1e7) / 1e7,
      lon: Math.round(merkez.lon * 1e7) / 1e7,
      ada,
      parsel,
      il: izmir.ad,
      ilce: ilce.ad,
      mahalle: mahalle.ad,
      adres,
    })
  } catch (err) {
    console.error('[TKGM] Hata:', err.message)
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Parsel bulunamadı (TKGM 404)', detail: err.response.data })
    }
    return res.status(502).json({ error: 'TKGM API hatası: ' + err.message })
  }
})

export default router
