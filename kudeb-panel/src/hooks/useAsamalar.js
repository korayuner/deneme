import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getAsamalar, createAsamalar, updateAsama,
  addAsamaAdimi, deleteAsama, logla,
} from '../api/directus'
import { mergeAsamaAdlari } from '../utils/constants'

export const useAsamalar = (isId) => {
  return useQuery({
    queryKey: ['asamalar', isId],
    queryFn: () => getAsamalar(isId),
    enabled: !!isId,
  })
}

export const useCreateAsamalar = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ isId, isTurleri }) => {
      const adlar = mergeAsamaAdlari(isTurleri)
      return createAsamalar(isId, adlar)
    },
    onSuccess: (_, { isId }) => {
      queryClient.invalidateQueries({ queryKey: ['asamalar', isId] })
      queryClient.invalidateQueries({ queryKey: ['job', isId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (err) => toast.error('Aşama oluşturulamadı: ' + err.message),
  })
}

export const useTamamlaAsama = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ asamaId, isId, aciklama, not, isTamamlandi }) => {
      const data = {
        tamamlandi: isTamamlandi,
        tamamlanma_tarihi: isTamamlandi ? new Date().toISOString() : null,
        ...(aciklama !== undefined && { not: aciklama }),
        ...(not !== undefined && { not }),
      }
      return updateAsama(asamaId, data, isId)
    },
    onSuccess: (_, { isId, asamaAdi, isTamamlandi }) => {
      queryClient.invalidateQueries({ queryKey: ['asamalar', isId] })
      queryClient.invalidateQueries({ queryKey: ['job', isId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      if (isTamamlandi) {
        logla(isId, 'asama_tamamlandi', `Aşama tamamlandı: "${asamaAdi}"`)
        toast.success('Aşama tamamlandı')
      }
    },
    onError: (err) => toast.error('Hata: ' + err.message),
  })
}

export const useAddAsamaAdimi = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ isId, asamaAdi, enSonSira }) =>
      addAsamaAdimi(isId, asamaAdi, enSonSira),
    onSuccess: (_, { isId }) => {
      queryClient.invalidateQueries({ queryKey: ['asamalar', isId] })
      queryClient.invalidateQueries({ queryKey: ['job', isId] })
    },
    onError: (err) => toast.error('Adım eklenemedi: ' + err.message),
  })
}

export const useDeleteAsamaAdimi = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ asamaId, isId }) => deleteAsama(asamaId, isId),
    onSuccess: (_, { isId }) => {
      queryClient.invalidateQueries({ queryKey: ['asamalar', isId] })
      queryClient.invalidateQueries({ queryKey: ['job', isId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (err) => toast.error('Silinemedi: ' + err.message),
  })
}
