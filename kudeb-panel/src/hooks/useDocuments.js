import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDocumentsByJob, uploadDocument } from '../api/paperless'
import { uploadAndAnalyze, getBelgelerByIsNo, deleteBelge } from '../api/pdf'
import { triggerDocumentUpload } from '../api/n8n'
import toast from 'react-hot-toast'

// Paperless belgelerini ada+parsel ile çeker (eski yöntem — geriye dönük uyumluluk)
export const useDocuments = (ada, parsel) => {
  return useQuery({
    queryKey: ['documents', ada, parsel],
    queryFn: () => getDocumentsByJob(ada, parsel),
    enabled: !!(ada && parsel),
    select: (data) => data.results || [],
  })
}

// Directus kudeb_belgeler'den is_no bazlı izole belgeleri çeker
export const useJobBelgeler = (is_no) => {
  return useQuery({
    queryKey: ['belgeler', is_no],
    queryFn: () => getBelgelerByIsNo(is_no),
    enabled: !!is_no,
  })
}

/**
 * AI destekli yükleme — pdf-service üzerinden:
 * 1. PDF → pdf-service (metin çıkarma + Gemini analizi)
 * 2. Sonuç → onSuccess callback'iyle forma aktarılır (kullanıcı onaylar)
 * 3. Directus + Paperless'a otomatik kaydedilir
 */
export const useAiUpload = (job, { onAnalysisReady } = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, onProgress }) => {
      return uploadAndAnalyze(
        file,
        job.is_no,
        job.id,
        job.ozet || '',
        onProgress,
      )
    },
    onSuccess: (data) => {
      // Belge listesini yenile
      queryClient.invalidateQueries({ queryKey: ['belgeler', job.is_no] })
      // Analiz sonucunu üst bileşene ilet (forma doldurulsun)
      if (onAnalysisReady) onAnalysisReady(data.analiz)
      toast.success('Belge yüklendi ve analiz edildi')
    },
    onError: (err) => {
      toast.error('Yükleme hatası: ' + (err.response?.data?.error || err.message))
    },
  })
}

// Belge silme (Directus'tan)
export const useDeleteBelge = (is_no) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBelge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['belgeler', is_no] })
      toast.success('Belge silindi')
    },
    onError: () => toast.error('Silme hatası'),
  })
}

// Eski doğrudan Paperless yüklemesi (geriye dönük uyumluluk)
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

      try {
        await triggerDocumentUpload({
          document_id: result,
          is_no: jobContext.is_no,
          ada: jobContext.ada,
          parsel: jobContext.parsel,
          filename: file.name,
        })
      } catch {
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
