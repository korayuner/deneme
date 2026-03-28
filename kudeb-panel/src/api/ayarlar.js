import directus from './directus'

// ─── Sistem Ayarları (kudeb_ayarlar key-value) ────────────────────────────────

export const getAyarlar = async () => {
  const response = await directus.get('/items/kudeb_ayarlar', {
    params: { limit: -1, fields: 'id,anahtar,deger,aciklama' },
  })
  const list = response.data.data || []
  return Object.fromEntries(list.map((a) => [a.anahtar, a.deger]))
}

export const setAyar = async (anahtar, deger) => {
  const response = await directus.get('/items/kudeb_ayarlar', {
    params: {
      filter: JSON.stringify({ anahtar: { _eq: anahtar } }),
      fields: 'id',
      limit: 1,
    },
  })
  const mevcut = response.data.data?.[0]
  if (mevcut) {
    await directus.patch(`/items/kudeb_ayarlar/${mevcut.id}`, { deger })
  } else {
    await directus.post('/items/kudeb_ayarlar', { anahtar, deger })
  }
}

export const setAyarlar = async (ayarlar) => {
  await Promise.all(Object.entries(ayarlar).map(([k, v]) => setAyar(k, v)))
}

// ─── Personel ────────────────────────────────────────────────────────────────

export const getPersoneller = async () => {
  const res = await directus.get('/items/kudeb_personel', {
    params: { sort: 'ad', limit: -1, fields: 'id,ad' },
  })
  return res.data.data
}

export const addPersonel = async (ad) => {
  const res = await directus.post('/items/kudeb_personel', { ad })
  return res.data.data
}

export const deletePersonel = async (id) => {
  await directus.delete(`/items/kudeb_personel/${id}`)
}

// ─── İş Türleri ──────────────────────────────────────────────────────────────

export const getIsTurleri = async () => {
  const res = await directus.get('/items/kudeb_is_turleri', {
    params: { sort: 'sira,ad', limit: -1, fields: 'id,ad,sira' },
  })
  return res.data.data
}

export const addIsTuru = async (ad) => {
  const res = await directus.post('/items/kudeb_is_turleri', { ad })
  return res.data.data
}

export const deleteIsTuru = async (id) => {
  await directus.delete(`/items/kudeb_is_turleri/${id}`)
}

// ─── Aşama Şablonları ─────────────────────────────────────────────────────────

export const getAsamaSablonlari = async () => {
  const response = await directus.get('/items/kudeb_asama_sablonlari', {
    params: { sort: ['is_turu', 'sira'], limit: -1, fields: 'id,is_turu,sira,asama_adi' },
  })
  const list = response.data.data || []
  const grouped = {}
  list.forEach((item) => {
    if (!grouped[item.is_turu]) grouped[item.is_turu] = []
    grouped[item.is_turu].push(item)
  })
  return grouped
}

export const saveAsamaSablonu = async (isTuru, asamaAdlari) => {
  const mevcut = await directus.get('/items/kudeb_asama_sablonlari', {
    params: { filter: JSON.stringify({ is_turu: { _eq: isTuru } }), fields: 'id' },
  })
  if (mevcut.data.data.length > 0) {
    await directus.delete('/items/kudeb_asama_sablonlari', {
      data: mevcut.data.data.map((s) => s.id),
    })
  }
  if (asamaAdlari.length > 0) {
    await directus.post(
      '/items/kudeb_asama_sablonlari',
      asamaAdlari.map((ad, i) => ({ is_turu: isTuru, sira: i + 1, asama_adi: ad })),
    )
  }
}
