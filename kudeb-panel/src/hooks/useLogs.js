import { useQuery } from '@tanstack/react-query'
import { getLogs } from '../api/directus'

export const useLogs = (isId) => {
  return useQuery({
    queryKey: ['logs', isId],
    queryFn: () => getLogs(isId),
    enabled: !!isId,
    staleTime: 30 * 1000,
  })
}
