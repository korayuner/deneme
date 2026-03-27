import { useEffect, useState } from 'react'
import { RefreshCw, Upload, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import useStore from '../../store/useStore'
import { useJobs } from '../../hooks/useJobs'
import { createJob } from '../../api/directus'
import { getNextIsNo } from '../../api/directus'
import JobListItem from './JobListItem'
import SearchFilter from './SearchFilter'
import LoadingSpinner from '../common/LoadingSpinner'
import YaziYukleModal from './YaziYukleModal'

export default function JobList() {
  const {
    selectedJobId, setSelectedJobId, setActiveTab,
    searchQuery, filterIlce, filterTur, filterVade,
  } = useStore()
  const [yaziModalAcik, setYaziModalAcik] = useState(false)
  const queryClient = useQueryClient()

  const { data: jobs, isLoading, isError, refetch, isFetching } = useJobs({
    search: searchQuery,
    ilce: filterIlce,
    is_turu: filterTur,
    vade_filter: filterVade,
  })

  // Auto-select first job
  useEffect(() => {
    if (jobs?.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id)
    }
  }, [jobs, selectedJobId, setSelectedJobId])

  const handleYeniIs = async () => {
    try {
      const is_no = await getNextIsNo()
      const yeniIs = await createJob({ is_no })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      if (yeniIs?.id) {
        setSelectedJobId(yeniIs.id)
        setActiveTab('ozet')
      }
    } catch (err) {
      console.error('Yeni iş oluşturulamadı:', err)
    }
  }

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">İş Listesi</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setYaziModalAcik(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded transition-colors"
            title="Yazı Yükle"
          >
            <Upload size={12} />
            Yazı Yükle
          </button>
          <button
            onClick={handleYeniIs}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded transition-colors"
            title="Yeni İş"
          >
            <Plus size={12} />
            Yeni İş
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            title="Yenile"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      {yaziModalAcik && <YaziYukleModal onClose={() => setYaziModalAcik(false)} />}

      {/* Search & Filter */}
      <SearchFilter />

      {/* Count */}
      {jobs && (
        <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          {jobs.length} iş
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && <LoadingSpinner className="mt-8" />}
        {isError && (
          <div className="p-4 text-center text-sm text-red-500">
            Veri yüklenemedi
            <button onClick={() => refetch()} className="block mx-auto mt-2 text-blue-500 underline text-xs">
              Tekrar dene
            </button>
          </div>
        )}
        {jobs?.length === 0 && !isLoading && (
          <div className="p-4 text-center text-sm text-gray-400">İş bulunamadı</div>
        )}
        {jobs?.map((job) => (
          <JobListItem
            key={job.id}
            job={job}
            isSelected={selectedJobId === job.id}
            onClick={() => {
              setSelectedJobId(job.id)
              useStore.getState().setActiveTab('ozet')
            }}
          />
        ))}
      </div>
    </aside>
  )
}
