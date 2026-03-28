import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getJobs, getSubJobs, getJob, updateJobWithLog,
  getJobFilterOptions, getJobsForMap, createJob, getNextIsNo,
} from '../api/directus'

export const useJobs = (params) => {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => getJobs(params),
    select: (data) => data.data,
  })
}

export const useSubJobs = (parentId) => {
  return useQuery({
    queryKey: ['sub-jobs', parentId],
    queryFn: () => getSubJobs(parentId),
    enabled: !!parentId,
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
    mutationFn: ({ id, data }) => updateJobWithLog(id, data),
    onSuccess: (updatedJob) => {
      queryClient.setQueryData(['job', updatedJob.id], updatedJob)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['sub-jobs'] })
      toast.success('Kaydedildi')
    },
    onError: (err) => {
      toast.error('Kaydetme hatası: ' + (err.response?.data?.errors?.[0]?.message || err.message))
    },
  })
}

export const useCreateJob = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (err) => {
      toast.error('İş oluşturulamadı: ' + (err.response?.data?.errors?.[0]?.message || err.message))
    },
  })
}

export const useNextIsNo = (parentIsNo = null) => {
  return useQuery({
    queryKey: ['next-is-no', parentIsNo],
    queryFn: () => getNextIsNo(parentIsNo),
    staleTime: 0,
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
