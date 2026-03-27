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

export const getJobs = async (params = {}) => {
  const { search, ilce, is_turu, vade_filter, page = 1, limit = 100 } = params
  const filter = {}

  if (ilce) filter.ilce_adi = { _eq: ilce }
  if (is_turu) filter.is_turu_adi = { _eq: is_turu }
  if (search) {
    filter._or = [
      { is_no: { _icontains: search } },
      { ilce_adi: { _icontains: search } },
      { mahalle_adi: { _icontains: search } },
      { ada: { _icontains: search } },
      { parsel: { _icontains: search } },
    ]
  }

  const today = new Date().toISOString().split('T')[0]
  if (vade_filter === 'gecmis') {
    filter.vade_tarihi = { _lt: today }
  } else if (vade_filter === 'yaklasan') {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    filter.vade_tarihi = { _gte: today, _lte: nextWeek }
  }

  const response = await directus.get('/items/kudeb_isler', {
    params: {
      ...(Object.keys(filter).length > 0 && { filter: JSON.stringify(filter) }),
      sort: '-id',
      limit,
      page,
      fields: 'id,is_no,ilce_adi,mahalle_adi,ada,parsel,is_turu_adi,gorevli_personel,vade_tarihi,son_durum',
    },
  })
  return response.data
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

export const getJobFilterOptions = async () => {
  const [ilceler, turler] = await Promise.all([
    directus.get('/items/kudeb_isler', {
      params: {
        groupBy: 'ilce_adi',
        fields: 'ilce_adi',
        limit: -1,
      },
    }),
    directus.get('/items/kudeb_isler', {
      params: {
        groupBy: 'is_turu_adi',
        fields: 'is_turu_adi',
        limit: -1,
      },
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
      fields: '*',
    },
  })
  return response.data.data
}

export default directus
