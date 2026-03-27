import directus from './directus'

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
