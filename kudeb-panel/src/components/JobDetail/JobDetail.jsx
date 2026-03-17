import { Suspense, lazy } from 'react'
import { FileText, Map, Image, AlignLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'
import { useJob } from '../../hooks/useJobs'
import LoadingSpinner from '../common/LoadingSpinner'
import SummaryTab from './tabs/SummaryTab'
import DocumentsTab from './tabs/DocumentsTab'
import PhotosTab from './tabs/PhotosTab'

const MapTab = lazy(() => import('./tabs/MapTab'))

const TABS = [
  { id: 'ozet', label: 'Özet', icon: AlignLeft },
  { id: 'belgeler', label: 'Belgeler', icon: FileText },
  { id: 'harita', label: 'Harita', icon: Map },
  { id: 'fotograflar', label: 'Fotoğraf', icon: Image },
]

function TabButton({ tab, isActive, onClick }) {
  const Icon = tab.icon
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
        isActive
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300',
      )}
    >
      <Icon size={15} />
      <span className="hidden sm:inline">{tab.label}</span>
    </button>
  )
}

export default function JobDetail() {
  const { selectedJobId, activeTab, setActiveTab } = useStore()
  const { data: job, isLoading, isError } = useJob(selectedJobId)

  if (!selectedJobId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-300 dark:text-gray-600">
        <div className="text-center">
          <ChevronRight size={40} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Listeden bir iş seçin</p>
        </div>
      </div>
    )
  }

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>

  if (isError || !job) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        <p className="text-sm">İş verisi yüklenemedi</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-800">
      {/* Job header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-gray-800 dark:text-gray-100 truncate">
              <span className="font-mono text-blue-600 dark:text-blue-400 mr-2">{job.is_no}</span>
              {[job.ilce_adi, job.mahalle_adi].filter(Boolean).join(' / ')}
              {job.ada && <span className="text-gray-400 font-normal"> • {job.ada} ada {job.parsel} parsel</span>}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {job.is_turu_adi || 'İş türü belirtilmedi'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-x-auto">
        <div className="flex">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'ozet' && <SummaryTab job={job} />}
        {activeTab === 'belgeler' && <DocumentsTab job={job} />}
        {activeTab === 'harita' && (
          <Suspense fallback={<LoadingSpinner className="mt-12" />}>
            <MapTab job={job} />
          </Suspense>
        )}
        {activeTab === 'fotograflar' && <PhotosTab job={job} />}
      </div>
    </div>
  )
}
