import { Suspense, lazy } from 'react'
import { AlignLeft, CheckSquare, FileText, GitBranch, Shovel, Clock, Map, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'
import { useJob } from '../../hooks/useJobs'
import LoadingSpinner from '../common/LoadingSpinner'
import SummaryTab from './tabs/SummaryTab'
import AsamaTab from './tabs/AsamaTab'
import YazismalarTab from './tabs/YazismalarTab'
import AltIslerTab from './tabs/AltIslerTab'
import AraziTab from './tabs/AraziTab'
import GecmisTab from './tabs/GecmisTab'

const MapTab = lazy(() => import('./tabs/MapTab'))

// Tab tanımları — alt işi olan ana işte AltIsler sekmesi gösterilir
function getTabs(job) {
  const tabs = [
    { id: 'ozet', label: 'Özet', icon: AlignLeft },
  ]
  if (job?.parent_id === null && (job?._altIs_sayisi > 0)) {
    tabs.push({ id: 'altisler', label: 'Alt İşler', icon: GitBranch })
  }
  tabs.push({ id: 'asamalar', label: 'Aşamalar', icon: CheckSquare })
  tabs.push({ id: 'yazismalar', label: 'Yazışmalar', icon: FileText })
  tabs.push({ id: 'arazi', label: 'Arazi', icon: Shovel })
  tabs.push({ id: 'harita', label: 'Harita', icon: Map })
  tabs.push({ id: 'gecmis', label: 'Geçmiş', icon: Clock })
  return tabs
}

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

  const tabs = getTabs(job)
  // Eğer aktif sekme bu iş için yoksa özete dön
  const gecerliTab = tabs.find((t) => t.id === activeTab) ? activeTab : 'ozet'

  const pct = job.asama_toplam > 0
    ? Math.round((job.asama_tamamlanan / job.asama_toplam) * 100)
    : null

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
              {job.parent_id && <span className="ml-2 text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">Alt İş</span>}
            </p>
            {pct !== null && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full max-w-[160px] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{job.asama_tamamlanan}/{job.asama_toplam} aşama</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-x-auto">
        <div className="flex">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={gecerliTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {gecerliTab === 'ozet' && <SummaryTab job={job} />}
        {gecerliTab === 'altisler' && <AltIslerTab job={job} />}
        {gecerliTab === 'asamalar' && <AsamaTab job={job} />}
        {gecerliTab === 'yazismalar' && <YazismalarTab job={job} />}
        {gecerliTab === 'arazi' && <AraziTab job={job} />}
        {gecerliTab === 'harita' && (
          <Suspense fallback={<LoadingSpinner className="mt-12" />}>
            <MapTab job={job} />
          </Suspense>
        )}
        {gecerliTab === 'gecmis' && <GecmisTab job={job} />}
      </div>
    </div>
  )
}
