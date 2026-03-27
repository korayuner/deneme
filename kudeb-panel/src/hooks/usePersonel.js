import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPersoneller, addPersonel, deletePersonel, getIsTurleri, addIsTuru, deleteIsTuru } from '../api/ayarlar'
import toast from 'react-hot-toast'

export const usePersoneller = () => {
  return useQuery({
    queryKey: ['personeller'],
    queryFn: getPersoneller,
    staleTime: 5 * 60 * 1000,
  })
}

export const useAddPersonel = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addPersonel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personeller'] })
      toast.success('Kişi eklendi')
    },
    onError: () => toast.error('Eklenemedi'),
  })
}

export const useDeletePersonel = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePersonel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personeller'] })
      toast.success('Kişi silindi')
    },
    onError: () => toast.error('Silinemedi'),
  })
}

// ─── İş Türleri ──────────────────────────────────────────────────────────────

export const useIsTurleri = () => {
  return useQuery({
    queryKey: ['is-turleri'],
    queryFn: getIsTurleri,
    staleTime: 5 * 60 * 1000,
  })
}

export const useAddIsTuru = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addIsTuru,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-turleri'] })
      toast.success('İş türü eklendi')
    },
    onError: () => toast.error('Eklenemedi'),
  })
}

export const useDeleteIsTuru = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteIsTuru,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-turleri'] })
      toast.success('İş türü silindi')
    },
    onError: () => toast.error('Silinemedi'),
  })
}
