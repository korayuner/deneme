import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDocumentsByJob, uploadDocument } from '../api/paperless'
import { triggerDocumentUpload } from '../api/n8n'
import toast from 'react-hot-toast'

export const useDocuments = (ada, parsel) => {
  return useQuery({
    queryKey: ['documents', ada, parsel],
    queryFn: () => getDocumentsByJob(ada, parsel),
    enabled: !!(ada && parsel),
    select: (data) => data.results || [],
  })
}

export const useUploadDocument = (jobContext) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, metadata }) => {
      const result = await uploadDocument(file, {
        ...metadata,
        ada: jobContext.ada,
        parsel: jobContext.parsel,
        ilce: jobContext.ilce_adi,
        mahalle: jobContext.mahalle_adi,
      })

      // Trigger n8n webhook
      try {
        await triggerDocumentUpload({
          document_id: result,
          is_no: jobContext.is_no,
          ada: jobContext.ada,
          parsel: jobContext.parsel,
          filename: file.name,
        })
      } catch {
        // Webhook failure is non-critical
        console.warn('n8n webhook failed')
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', jobContext.ada, jobContext.parsel] })
      toast.success('Belge yüklendi')
    },
    onError: (err) => {
      toast.error('Yükleme hatası: ' + (err.response?.data?.detail || err.message))
    },
  })
}
