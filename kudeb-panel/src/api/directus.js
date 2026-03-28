import axios from 'axios'

const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL || '/api/directus'
const DIRECTUS_TOKEN = import.meta.env.VITE_DIRECTUS_TOKEN || 'kudeb_directus_static_token_2026'

const directus = axios.create({
  baseURL: DIRECTUS_URL,
  headers: {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    'Content-Type': 'application/json',
  },
})

// ─── İşler ────────────────────────────────────────────────────────────────────

export const getJobs = async (params = {}) => {
  const { search, ilce, is_turu, vade_filter, asama_filter, sadece_ana = false, page = 1, limit = 200 } = params
  const filter = {}

  // Sadece ana işler (parent_id null)
  if (sadece_ana) filter.parent_id = { _null: true }

  if (ilce) filter.ilce_adi = { _eq: ilce }
  if (is_turu) filter.is_turu_adi = { _icontains: is_turu }

  if (search) {
    filter._or = [
      { is_no: { _icontains: search } },
      { ilce_adi: { _icontains: search } },
      { mahalle_adi: { _icontains: search } },
      { ada: { _icontains: search } },
      { parsel: { _icontains: search } },
      { gorevli_personel: { _icontains: search } },
    ]
  }

  const today = new Date().toISOString().split('T')[0]
  if (vade_filter === 'gecmis') {
    filter.vade_tarihi = { _lt: today }
  } else if (vade_filter === 'yaklasan') {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    filter.vade_tarihi = { _gte: today, _lte: nextWeek }
  }

  // Aşama filtresi (tamamlandı / devam ediyor / başlanmadı)
  if (asama_filter === 'tamamlandi') {
    filter._and = [...(filter._and || []), { asama_toplam: { _gt: 0 } }, { asama_tamamlanan: { _eq: { _column: 'asama_toplam' } } }]
  } else if (asama_filter === 'devam') {
    filter._and = [...(filter._and || []), { asama_toplam: { _gt: 0 } }, { asama_tamamlanan: { _lt: { _column: 'asama_toplam' } } }]
  } else if (asama_filter === 'baslanmadi') {
    filter._and = [...(filter._and || []), { _or: [{ asama_toplam: { _null: true } }, { asama_toplam: { _eq: 0 } }] }]
  }

  const response = await directus.get('/items/kudeb_isler', {
    params: {
      ...(Object.keys(filter).length > 0 && { filter: JSON.stringify(filter) }),
      sort: '-id',
      limit,
      page,
      fields: 'id,is_no,parent_id,ilce_adi,mahalle_adi,ada,parsel,eski_ada,eski_parsel,is_turu_adi,gorevli_personel,vade_tarihi,son_durum,asama_tamamlanan,asama_toplam',
    },
  })
  return response.data
}

export const getSubJobs = async (parentId) => {
  const response = await directus.get('/items/kudeb_isler', {
    params: {
      filter: JSON.stringify({ parent_id: { _eq: parentId } }),
      sort: 'is_no',
      limit: 200,
      fields: 'id,is_no,parent_id,ilce_adi,mahalle_adi,ada,parsel,is_turu_adi,gorevli_personel,vade_tarihi,son_durum,asama_tamamlanan,asama_toplam',
    },
  })
  return response.data.data
}

export const getJob = async (id) => {
  const response = await directus.get(`/items/kudeb_isler/${id}`, {
    params: { fields: '*' },
  })
  return response.data.data
}

export const updateJob = async (id, data) => {
  const response = await directus.patch(`/items/kudeb_isler/${id}`, data)
  return response.data.data
}

export const getNextIsNo = async (parentIsNo = null) => {
  const year = new Date().getFullYear()

  if (parentIsNo) {
    // Alt iş numarası: 2026-031-A01
    const prefix = `${parentIsNo}-A`
    const res = await directus.get('/items/kudeb_isler', {
      params: {
        filter: JSON.stringify({ is_no: { _starts_with: prefix } }),
        sort: '-is_no',
        limit: 1,
        fields: 'is_no',
      },
    })
    const last = res.data?.data?.[0]?.is_no
    if (last) {
      const num = parseInt(last.split('-A')[1] || '0')
      return `${parentIsNo}-A${String(num + 1).padStart(2, '0')}`
    }
    return `${parentIsNo}-A01`
  }

  // Ana iş numarası: 2026-031
  const res = await directus.get('/items/kudeb_isler', {
    params: {
      filter: JSON.stringify({
        _and: [
          { is_no: { _starts_with: `${year}-` } },
          { parent_id: { _null: true } },
          // Sadece ana işler (alt iş değil: A içermemeli)
          { is_no: { _ncontains: '-A' } },
        ],
      }),
      sort: '-is_no',
      limit: 1,
      fields: 'is_no',
    },
  })
  const last = res.data?.data?.[0]?.is_no
  if (last) {
    const parts = last.split('-')
    const num = parseInt(parts[1] || '0')
    return `${year}-${String(num + 1).padStart(3, '0')}`
  }
  return `${year}-001`
}

export const createJob = async (data) => {
  const response = await directus.post('/items/kudeb_isler', data)
  return response.data.data
}

export const getJobFilterOptions = async () => {
  const [ilceler, turler] = await Promise.all([
    directus.get('/items/kudeb_isler', {
      params: { groupBy: 'ilce_adi', fields: 'ilce_adi', limit: -1 },
    }),
    directus.get('/items/kudeb_isler', {
      params: { groupBy: 'is_turu_adi', fields: 'is_turu_adi', limit: -1 },
    }),
  ])
  return {
    ilceler: ilceler.data.data.map((i) => i.ilce_adi).filter(Boolean).sort(),
    turler: turler.data.data.map((t) => t.is_turu_adi).filter(Boolean).sort(),
  }
}

export const getJobsForMap = async () => {
  const response = await directus.get('/items/kudeb_isler', {
    params: {
      limit: -1,
      fields: 'id,is_no,parent_id,ilce_adi,mahalle_adi,ada,parsel,koordinat_lat,koordinat_lon,vade_tarihi,asama_tamamlanan,asama_toplam,is_turu_adi',
    },
  })
  return response.data.data
}

// ─── Aşamalar ─────────────────────────────────────────────────────────────────

export const getAsamalar = async (isId) => {
  const response = await directus.get('/items/kudeb_is_asamalari', {
    params: {
      filter: JSON.stringify({ is_id: { _eq: isId } }),
      sort: 'sira',
      limit: 50,
    },
  })
  return response.data.data
}

export const createAsamalar = async (isId, asamaAdlari) => {
  const items = asamaAdlari.map((ad, i) => ({
    is_id: isId,
    asama_adi: ad,
    sira: i + 1,
    tamamlandi: false,
  }))
  const response = await directus.post('/items/kudeb_is_asamalari', items)
  // Toplam aşama sayısını işe yaz
  await directus.patch(`/items/kudeb_isler/${isId}`, {
    asama_toplam: asamaAdlari.length,
    asama_tamamlanan: 0,
  })
  return response.data.data
}

export const updateAsama = async (asamaId, data, isId) => {
  const response = await directus.patch(`/items/kudeb_is_asamalari/${asamaId}`, data)
  // Tamamlanan sayısını güncelle
  if (isId && data.tamamlandi !== undefined) {
    const asamalar = await getAsamalar(isId)
    const tamamlanan = asamalar.filter((a) => a.tamamlandi).length
    await directus.patch(`/items/kudeb_isler/${isId}`, { asama_tamamlanan: tamamlanan })
  }
  return response.data.data
}

export const addAsamaAdimi = async (isId, asamaAdi, enSonSira) => {
  const response = await directus.post('/items/kudeb_is_asamalari', {
    is_id: isId,
    asama_adi: asamaAdi,
    sira: enSonSira + 1,
    tamamlandi: false,
  })
  // Toplam sayısını artır
  const job = await getJob(isId)
  await directus.patch(`/items/kudeb_isler/${isId}`, {
    asama_toplam: (job.asama_toplam || 0) + 1,
  })
  return response.data.data
}

export const deleteAsama = async (asamaId, isId) => {
  await directus.delete(`/items/kudeb_is_asamalari/${asamaId}`)
  if (isId) {
    const asamalar = await getAsamalar(isId)
    const tamamlanan = asamalar.filter((a) => a.tamamlandi).length
    await directus.patch(`/items/kudeb_isler/${isId}`, {
      asama_toplam: asamalar.length,
      asama_tamamlanan: tamamlanan,
    })
  }
}

// ─── Belgeler / Yazışmalar ─────────────────────────────────────────────────────

export const getBelgelerForJob = async (isId) => {
  // Junction tablosundan belge ID'lerini al
  const jRes = await directus.get('/items/kudeb_belge_isler', {
    params: {
      filter: JSON.stringify({ is_id: { _eq: isId } }),
      fields: 'id,belge_id,uyari',
      limit: 200,
    },
  })
  const links = jRes.data.data
  if (!links.length) return []

  const belgeIds = links.map((l) => l.belge_id)
  const bRes = await directus.get('/items/kudeb_belgeler', {
    params: {
      filter: JSON.stringify({ id: { _in: belgeIds } }),
      sort: '-tarih',
      fields: 'id,dosya_adi,tur,kimden,kime,tarih,sayi,konu,ozet,paperless_id,beklemede',
    },
  })

  // Uyarıları belgelere ekle
  const uyariMap = {}
  links.forEach((l) => { uyariMap[l.belge_id] = { uyari: l.uyari, link_id: l.id } })

  return bRes.data.data.map((b) => ({ ...b, ...uyariMap[b.id] }))
}

export const getBekleyenBelgeler = async () => {
  const response = await directus.get('/items/kudeb_belgeler', {
    params: {
      filter: JSON.stringify({ beklemede: { _eq: true } }),
      sort: '-date_created',
      fields: 'id,dosya_adi,tur,kimden,kime,tarih,sayi,konu,ozet,ilce,mahalle,ada,parsel',
      limit: 100,
    },
  })
  return response.data.data
}

export const createBelge = async (belgeData, isIds = []) => {
  const response = await directus.post('/items/kudeb_belgeler', {
    ...belgeData,
    beklemede: isIds.length === 0,
  })
  const belge = response.data.data

  // Junction kayıtları oluştur
  if (isIds.length > 0) {
    await Promise.all(
      isIds.map((is_id) =>
        directus.post('/items/kudeb_belge_isler', {
          belge_id: belge.id,
          is_id,
          uyari: belgeData._uyari || null,
        })
      )
    )
  }
  return belge
}

export const updateBelge = async (belgeId, data, yeniIsIds = null) => {
  await directus.patch(`/items/kudeb_belgeler/${belgeId}`, data)

  if (yeniIsIds !== null) {
    // Eski junction kayıtlarını sil
    const eskiLinks = await directus.get('/items/kudeb_belge_isler', {
      params: { filter: JSON.stringify({ belge_id: { _eq: belgeId } }), fields: 'id' },
    })
    if (eskiLinks.data.data.length > 0) {
      await directus.delete('/items/kudeb_belge_isler', {
        data: eskiLinks.data.data.map((l) => l.id),
      })
    }
    // Yeni junction kayıtları ekle
    if (yeniIsIds.length > 0) {
      await Promise.all(
        yeniIsIds.map((is_id) =>
          directus.post('/items/kudeb_belge_isler', { belge_id: belgeId, is_id })
        )
      )
      await directus.patch(`/items/kudeb_belgeler/${belgeId}`, { beklemede: false })
    } else {
      await directus.patch(`/items/kudeb_belgeler/${belgeId}`, { beklemede: true })
    }
  }
}

export const deleteBelge = async (belgeId) => {
  // Junction kayıtlarını sil
  const links = await directus.get('/items/kudeb_belge_isler', {
    params: { filter: JSON.stringify({ belge_id: { _eq: belgeId } }), fields: 'id' },
  })
  if (links.data.data.length > 0) {
    await directus.delete('/items/kudeb_belge_isler', {
      data: links.data.data.map((l) => l.id),
    })
  }
  await directus.delete(`/items/kudeb_belgeler/${belgeId}`)
}

export const getBelgeEkleri = async (belgeId) => {
  const response = await directus.get('/items/kudeb_belge_ekleri', {
    params: {
      filter: JSON.stringify({ belge_id: { _eq: belgeId } }),
      sort: 'date_created',
    },
  })
  return response.data.data
}

export const deleteBelgeEki = async (ekId) => {
  await directus.delete(`/items/kudeb_belge_ekleri/${ekId}`)
}

// ─── Loglar ────────────────────────────────────────────────────────────────────

export const getLogs = async (isId) => {
  const response = await directus.get('/items/kudeb_is_loglari', {
    params: {
      filter: JSON.stringify({ is_id: { _eq: isId } }),
      sort: '-date_created',
      limit: 100,
    },
  })
  return response.data.data
}

export const logla = async (isId, eylem, aciklama, eskiDeger = null, yeniDeger = null) => {
  try {
    await directus.post('/items/kudeb_is_loglari', {
      is_id: isId,
      eylem,
      aciklama,
      eski_deger: eskiDeger ? String(eskiDeger) : null,
      yeni_deger: yeniDeger ? String(yeniDeger) : null,
    })
  } catch {
    // Log hatası ana işlemi engellemez
  }
}

// updateJob + otomatik log
export const updateJobWithLog = async (id, data) => {
  const job = await getJob(id)
  const updated = await updateJob(id, data)

  const ALAN_ETIKET = {
    ada: 'Ada', parsel: 'Parsel', ilce_adi: 'İlçe', mahalle_adi: 'Mahalle',
    is_turu_adi: 'İş Türü', gorevli_personel: 'Görevli', vade_tarihi: 'Vade Tarihi',
    son_durum: 'Son Durum', kronolojik_ozet: 'Kronoloji', oneri: 'Öneri',
    koordinat_lat: 'Koordinat', koordinat_lon: 'Koordinat',
    eski_ada: 'Eski Ada', eski_parsel: 'Eski Parsel',
    tescil_aciklamasi: 'Tescil Açıklaması',
  }

  for (const [field, yeniVal] of Object.entries(data)) {
    const eskiVal = job[field]
    if (eskiVal !== yeniVal && ALAN_ETIKET[field]) {
      await logla(id, 'alan_duzenlendi',
        `${ALAN_ETIKET[field]} düzenlendi`,
        eskiVal || '-',
        yeniVal || '-',
      )
    }
  }
  return updated
}

// ─── Arazi Ziyaretleri ────────────────────────────────────────────────────────

export const getAraziZiyaretleri = async (isId) => {
  const response = await directus.get('/items/kudeb_arazi_ziyaretleri', {
    params: {
      filter: JSON.stringify({ is_id: { _eq: isId } }),
      sort: '-tarih',
      limit: 100,
    },
  })
  return response.data.data
}

export const createAraziZiyareti = async (data) => {
  const response = await directus.post('/items/kudeb_arazi_ziyaretleri', data)
  return response.data.data
}

export const updateAraziZiyareti = async (id, data) => {
  const response = await directus.patch(`/items/kudeb_arazi_ziyaretleri/${id}`, data)
  return response.data.data
}

export const deleteAraziZiyareti = async (id) => {
  // Önce fotoğrafları sil
  const fotoRes = await directus.get('/items/kudeb_arazi_fotograflari', {
    params: { filter: JSON.stringify({ ziyaret_id: { _eq: id } }), fields: 'id' },
  })
  if (fotoRes.data.data.length > 0) {
    await directus.delete('/items/kudeb_arazi_fotograflari', {
      data: fotoRes.data.data.map((f) => f.id),
    })
  }
  await directus.delete(`/items/kudeb_arazi_ziyaretleri/${id}`)
}

export const getAraziFotograflar = async (ziyaretId) => {
  const response = await directus.get('/items/kudeb_arazi_fotograflari', {
    params: {
      filter: JSON.stringify({ ziyaret_id: { _eq: ziyaretId } }),
      sort: 'date_created',
    },
  })
  return response.data.data
}

export const createAraziFotograf = async (data) => {
  const response = await directus.post('/items/kudeb_arazi_fotograflari', data)
  return response.data.data
}

export const deleteAraziFotograf = async (id) => {
  await directus.delete(`/items/kudeb_arazi_fotograflari/${id}`)
}

export default directus
