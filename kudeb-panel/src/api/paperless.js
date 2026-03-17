import axios from 'axios'

const PAPERLESS_URL = import.meta.env.VITE_PAPERLESS_URL || '/api/paperless'
const PAPERLESS_TOKEN = import.meta.env.VITE_PAPERLESS_TOKEN || '99f9f7bccdb06e532e4ae58780139859ba5278a5'

const paperless = axios.create({
  baseURL: PAPERLESS_URL,
  headers: {
    Authorization: `Token ${PAPERLESS_TOKEN}`,
  },
})

// Custom field IDs
const FIELDS = {
  ada: 5,
  parsel: 6,
  ilce: 3,
  mahalle: 4,
  evrak_no: 9,
  yazi_tarihi: 10,
  tur: 11,
  kimden: 12,
  kime: 23,
  tescil_aciklamasi: 22,
  notlar: 27,
}

export const getDocumentsByAdaParsel = async (ada, parsel, page = 1) => {
  if (!ada || !parsel) return { results: [], count: 0 }

  const response = await paperless.get('/api/documents/', {
    params: {
      custom_field_query: JSON.stringify([
        'AND',
        ['custom_fields__field', ada, FIELDS.ada.toString()],
        ['custom_fields__value', ada],
        ['custom_fields__field', parsel, FIELDS.parsel.toString()],
        ['custom_fields__value', parsel],
      ]),
      page,
      page_size: 50,
      ordering: '-created',
    },
  })
  return response.data
}

export const getDocumentsByJob = async (ada, parsel) => {
  if (!ada || !parsel) return { results: [], count: 0 }

  // Filter by ada and parsel custom fields
  const response = await paperless.get('/api/documents/', {
    params: {
      'custom_fields__field': [FIELDS.ada, FIELDS.parsel],
      'custom_fields__value': [ada, parsel],
      page_size: 100,
      ordering: 'created',
    },
  })
  return response.data
}

export const searchDocuments = async ({ ada, parsel, query, page = 1 } = {}) => {
  const params = { page, page_size: 50, ordering: '-created' }

  if (query) params.query = query

  // Use custom field filtering for ada/parsel
  if (ada && parsel) {
    params['custom_fields__field__in'] = `${FIELDS.ada},${FIELDS.parsel}`
  }

  const response = await paperless.get('/api/documents/', { params })
  return response.data
}

export const uploadDocument = async (file, metadata = {}) => {
  const formData = new FormData()
  formData.append('document', file)

  if (metadata.title) formData.append('title', metadata.title)
  if (metadata.created) formData.append('created', metadata.created)

  // Custom fields as JSON
  const customFields = []
  if (metadata.ada) customFields.push({ field: FIELDS.ada, value: metadata.ada })
  if (metadata.parsel) customFields.push({ field: FIELDS.parsel, value: metadata.parsel })
  if (metadata.ilce) customFields.push({ field: FIELDS.ilce, value: metadata.ilce })
  if (metadata.mahalle) customFields.push({ field: FIELDS.mahalle, value: metadata.mahalle })

  if (customFields.length > 0) {
    formData.append('custom_fields', JSON.stringify(customFields))
  }

  const response = await axios.post(`${PAPERLESS_URL}/api/documents/post_document/`, formData, {
    headers: {
      Authorization: `Token ${PAPERLESS_TOKEN}`,
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const getDocument = async (id) => {
  const response = await paperless.get(`/api/documents/${id}/`)
  return response.data
}

export const getDocumentThumb = (id) =>
  `${PAPERLESS_URL}/api/documents/${id}/thumb/`

export const getDocumentPreview = (id) =>
  `${PAPERLESS_URL}/api/documents/${id}/preview/`

export const getDocumentDownload = (id) =>
  `${PAPERLESS_URL}/api/documents/${id}/download/`

export const getPaperlessDocumentUrl = (id) => {
  const base = import.meta.env.VITE_PAPERLESS_EXTERNAL_URL || 'http://paperless.urla.online'
  return `${base}/documents/${id}/`
}

export const updateDocumentOrder = async (id, order) => {
  await paperless.patch(`/api/documents/${id}/`, { custom_fields: [{ field: FIELDS.notlar, value: `order:${order}` }] })
}

export default paperless
