import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getAraziZiyaretleri, createAraziZiyareti, updateAraziZiyareti,
  deleteAraziZiyareti, getAraziFotograflar, createAraziFotograf, deleteAraziFotograf,
  logla,
} from '../api/directus'

export const useAraziZiyaretleri = (isId) => {
  return useQuery({
    queryKey: ['arazi', isId],
    queryFn: () => getAraziZiyaretleri(isId),
    enabled: !!isId,
  })
}

export const useCreateAraziZiyareti = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => createAraziZiyareti(data),
    onSuccess: (yeni, data) => {
      queryClient.invalidateQueries({ queryKey: ['arazi', data.is_id] })
      logla(data.is_id, 'arazi_ziyareti', `Arazi ziyareti eklendi: ${data.tarih}`)
      toast.success('Ziyaret kaydedildi')
    },
    onError: (err) => toast.error('Hata: ' + err.message),
  })
}

export const useUpdateAraziZiyareti = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data, isId }) => updateAraziZiyareti(id, data),
    onSuccess: (_, { isId }) => {
      queryClient.invalidateQueries({ queryKey: ['arazi', isId] })
      toast.success('Kaydedildi')
    },
    onError: (err) => toast.error('Hata: ' + err.message),
  })
}

export const useDeleteAraziZiyareti = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isId }) => deleteAraziZiyareti(id),
    onSuccess: (_, { isId }) => {
      queryClient.invalidateQueries({ queryKey: ['arazi', isId] })
      toast.success('Ziyaret silindi')
    },
    onError: (err) => toast.error('Silinemedi: ' + err.message),
  })
}

export const useAraziFotograflar = (ziyaretId) => {
  return useQuery({
    queryKey: ['arazi-foto', ziyaretId],
    queryFn: () => getAraziFotograflar(ziyaretId),
    enabled: !!ziyaretId,
  })
}

export const useCreateAraziFotograf = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => createAraziFotograf(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['arazi-foto', data.ziyaret_id] })
    },
    onError: (err) => toast.error('Fotoğraf eklenemedi: ' + err.message),
  })
}

export const useDeleteAraziFotograf = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ziyaretId }) => deleteAraziFotograf(id),
    onSuccess: (_, { ziyaretId }) => {
      queryClient.invalidateQueries({ queryKey: ['arazi-foto', ziyaretId] })
    },
    onError: (err) => toast.error('Silinemedi: ' + err.message),
  })
}
