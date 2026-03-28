import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getBelgelerForJob, getBekleyenBelgeler, createBelge, updateBelge, deleteBelge,
  getBelgeEkleri, deleteBelgeEki, logla,
} from '../api/directus'

export const useBelgeler = (isId) => {
  return useQuery({
    queryKey: ['belgeler', isId],
    queryFn: () => getBelgelerForJob(isId),
    enabled: !!isId,
  })
}

export const useBekleyenBelgeler = () => {
  return useQuery({
    queryKey: ['bekleyen-belgeler'],
    queryFn: getBekleyenBelgeler,
    staleTime: 60 * 1000,
  })
}

export const useCreateBelge = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ belgeData, isIds }) => createBelge(belgeData, isIds),
    onSuccess: (_, { isIds }) => {
      isIds?.forEach((id) => queryClient.invalidateQueries({ queryKey: ['belgeler', id] }))
      queryClient.invalidateQueries({ queryKey: ['bekleyen-belgeler'] })
      toast.success('Belge kaydedildi')
    },
    onError: (err) => toast.error('Kayıt hatası: ' + err.message),
  })
}

export const useUpdateBelge = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ belgeId, data, yeniIsIds, isId }) => updateBelge(belgeId, data, yeniIsIds),
    onSuccess: (_, { isId }) => {
      if (isId) queryClient.invalidateQueries({ queryKey: ['belgeler', isId] })
      queryClient.invalidateQueries({ queryKey: ['bekleyen-belgeler'] })
      toast.success('Kaydedildi')
    },
    onError: (err) => toast.error('Hata: ' + err.message),
  })
}

export const useDeleteBelge = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ belgeId, isId }) => deleteBelge(belgeId),
    onSuccess: (_, { isId }) => {
      if (isId) queryClient.invalidateQueries({ queryKey: ['belgeler', isId] })
      queryClient.invalidateQueries({ queryKey: ['bekleyen-belgeler'] })
      toast.success('Belge silindi')
    },
    onError: (err) => toast.error('Silinemedi: ' + err.message),
  })
}

export const useBelgeEkleri = (belgeId) => {
  return useQuery({
    queryKey: ['belge-ekler', belgeId],
    queryFn: () => getBelgeEkleri(belgeId),
    enabled: !!belgeId,
  })
}

export const useDeleteBelgeEki = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ekId, belgeId }) => deleteBelgeEki(ekId),
    onSuccess: (_, { belgeId }) => {
      queryClient.invalidateQueries({ queryKey: ['belge-ekler', belgeId] })
    },
    onError: (err) => toast.error('Silinemedi: ' + err.message),
  })
}
