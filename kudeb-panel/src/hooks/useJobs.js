import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobs, getJob, updateJob, getJobFilterOptions, getJobsForMap } from '../api/directus'
import toast from 'react-hot-toast'

export const useJobs = (params) => {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => getJobs(params),
    select: (data) => data.data,
  })
}

export const useJob = (id) => {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id),
    enabled: !!id,
  })
}

export const useUpdateJob = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => updateJob(id, data),
    onSuccess: (updatedJob) => {
      queryClient.setQueryData(['job', updatedJob.id], updatedJob)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      toast.success('Kaydedildi')
    },
    onError: (err) => {
      toast.error('Kaydetme hatası: ' + (err.response?.data?.errors?.[0]?.message || err.message))
    },
  })
}

export const useJobFilterOptions = () => {
  return useQuery({
    queryKey: ['job-filter-options'],
    queryFn: getJobFilterOptions,
    staleTime: 5 * 60 * 1000,
  })
}

export const useJobsForMap = () => {
  return useQuery({
    queryKey: ['jobs-for-map'],
    queryFn: getJobsForMap,
    staleTime: 2 * 60 * 1000,
  })
}
