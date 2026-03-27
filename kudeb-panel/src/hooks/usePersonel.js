import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPersoneller, addPersonel, deletePersonel } from '../api/ayarlar'
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
