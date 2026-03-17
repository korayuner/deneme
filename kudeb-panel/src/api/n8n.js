import axios from 'axios'

const N8N_URL = import.meta.env.VITE_N8N_URL || '/api/n8n'

export const triggerDocumentUpload = async (payload) => {
  const response = await axios.post(`${N8N_URL}/webhook/kudeb-belge-yukle`, payload)
  return response.data
}
