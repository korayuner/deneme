import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getAyarlar, setAyar, setAyarlar,
  getAsamaSablonlari, saveAsamaSablonu,
} from '../api/ayarlar'

export const useAyarlar = () => {
  return useQuery({
    queryKey: ['ayarlar'],
    queryFn: getAyarlar,
    staleTime: 5 * 60 * 1000,
  })
}

export const useSetAyar = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ anahtar, deger }) => setAyar(anahtar, deger),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ayarlar'] })
      toast.success('Ayar kaydedildi')
    },
    onError: (err) => toast.error('Kaydetme hatası: ' + err.message),
  })
}

export const useSetAyarlar = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ayarlar) => setAyarlar(ayarlar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ayarlar'] })
      toast.success('Ayarlar kaydedildi')
    },
    onError: (err) => toast.error('Kaydetme hatası: ' + err.message),
  })
}

export const useAsamaSablonlari = () => {
  return useQuery({
    queryKey: ['asama-sablonlari'],
    queryFn: getAsamaSablonlari,
    staleTime: 5 * 60 * 1000,
  })
}

export const useSaveAsamaSablonu = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ isTuru, asamaAdlari }) => saveAsamaSablonu(isTuru, asamaAdlari),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asama-sablonlari'] })
      toast.success('Şablon kaydedildi')
    },
    onError: (err) => toast.error('Şablon kaydedilemedi: ' + err.message),
  })
}
