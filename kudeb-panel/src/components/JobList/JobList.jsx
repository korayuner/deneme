import { useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import useStore from '../../store/useStore'
import { useJobs } from '../../hooks/useJobs'
import JobListItem from './JobListItem'
import SearchFilter from './SearchFilter'
import LoadingSpinner from '../common/LoadingSpinner'

export default function JobList() {
  const {
    selectedJobId, setSelectedJobId,
    searchQuery, filterIlce, filterTur, filterVade,
  } = useStore()

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

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">İş Listesi</h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          title="Yenile"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

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
