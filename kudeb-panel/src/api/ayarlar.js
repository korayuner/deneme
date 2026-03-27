import directus from './directus'

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
