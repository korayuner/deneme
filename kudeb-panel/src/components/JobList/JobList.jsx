import { useEffect, useState } from 'react'
import { RefreshCw, Upload, Plus, Bell } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import useStore from '../../store/useStore'
import { useJobs, useSubJobs } from '../../hooks/useJobs'
import { createJob, getNextIsNo } from '../../api/directus'
import JobListItem from './JobListItem'
import SearchFilter from './SearchFilter'
import LoadingSpinner from '../common/LoadingSpinner'
import YaziYukleModal from './YaziYukleModal'
import BekleyenYazismalar from './BekleyenYazismalar'

// Alt işler — sadece genişletilmiş ana işin altında görünür
function SubJobList({ parentId, selectedJobId, onSelect }) {
  const { data: subJobs = [], isLoading } = useSubJobs(parentId)
  if (isLoading) return <div className="pl-7 py-1"><LoadingSpinner size="sm" /></div>
  return (
    <>
      {subJobs.map((job) => (
        <JobListItem
          key={job.id}
          job={job}
          isSelected={selectedJobId === job.id}
          isSubJob
          onClick={() => onSelect(job.id)}
        />
      ))}
    </>
  )
}

export default function JobList() {
  const {
    selectedJobId, setSelectedJobId, setActiveTab,
    searchQuery, filterIlce, filterTur, filterVade, filterAsama,
    expandedParents,
  } = useStore()

  const [yaziModalAcik, setYaziModalAcik] = useState(false)
  const [bekleyenAcik, setBekleyenAcik] = useState(false)
  const queryClient = useQueryClient()

  const { data: jobs = [], isLoading, isError, refetch, isFetching } = useJobs({
    search: searchQuery,
    ilce: filterIlce,
    is_turu: filterTur,
    vade_filter: filterVade,
    asama_filter: filterAsama,
  })

  // Auto-select first job
  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id)
    }
  }, [jobs, selectedJobId, setSelectedJobId])

  const handleSelect = (id) => {
    setSelectedJobId(id)
    setActiveTab('ozet')
  }

  const handleYeniIs = async () => {
    try {
      const is_no = await getNextIsNo()
      const yeniIs = await createJob({ is_no })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      if (yeniIs?.id) handleSelect(yeniIs.id)
    } catch (err) {
      console.error('Yeni iş oluşturulamadı:', err)
    }
  }

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">İş Listesi</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              title="Yenile"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setYaziModalAcik(true)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-md transition-colors"
          >
            <Upload size={12} />
            Yazı Yükle
          </button>
          <button
            onClick={handleYeniIs}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-md transition-colors"
          >
            <Plus size={12} />
            Yeni İş
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <SearchFilter />

      {/* Count */}
      {jobs.length > 0 && (
        <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 flex items-center justify-between">
          <span>{jobs.length} iş</span>
          <button
            onClick={() => setBekleyenAcik(true)}
            className="flex items-center gap-1 text-amber-500 hover:text-amber-600"
            title="Bekleyen yazışmalar"
          >
            <Bell size={11} />
          </button>
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
        {jobs.length === 0 && !isLoading && (
          <div className="p-4 text-center text-sm text-gray-400">İş bulunamadı</div>
        )}
        {jobs.map((job) => (
          <div key={job.id}>
            <JobListItem
              job={job}
              isSelected={selectedJobId === job.id}
              onClick={() => handleSelect(job.id)}
            />
            {/* Alt işler — genişletilmişse göster */}
            {expandedParents.includes(job.id) && job.parent_id === null && (
              <SubJobList
                parentId={job.id}
                selectedJobId={selectedJobId}
                onSelect={handleSelect}
              />
            )}
          </div>
        ))}
      </div>

      {yaziModalAcik && <YaziYukleModal onClose={() => setYaziModalAcik(false)} />}
      {bekleyenAcik && <BekleyenYazismalar onClose={() => setBekleyenAcik(false)} />}
    </aside>
  )
}
