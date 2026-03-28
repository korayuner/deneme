import { AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { getVadeDurumu } from '../../utils/date'
import { ilerlemeHesapla } from '../../utils/constants'
import useStore from '../../store/useStore'

// İlerleme çubuğu
function IlerlemeBar({ tamamlanan, toplam }) {
  if (!toplam) return null
  const pct = ilerlemeHesapla(tamamlanan, toplam)
  const renk = pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-blue-500' : 'bg-gray-300'
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div className={`h-full ${renk} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 flex-shrink-0">
        {tamamlanan}/{toplam}
      </span>
    </div>
  )
}

export default function JobListItem({ job, isSelected, onClick, isSubJob = false }) {
  const vadeDurumu = getVadeDurumu(job.vade_tarihi)
  const { expandedParents, toggleParentExpand } = useStore()
  const hasChildren = !isSubJob && job._altIs_sayisi > 0
  const isExpanded = expandedParents.includes(job.id)

  const handleExpandToggle = (e) => {
    e.stopPropagation()
    toggleParentExpand(job.id)
  }

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors',
        isSelected && 'bg-blue-50 dark:bg-gray-700 border-l-2 border-l-blue-500',
        isSubJob && 'pl-7 bg-gray-50/50 dark:bg-gray-800/50',
      )}
    >
      <div className="flex items-start gap-1">
        {/* Genişlet butonu (sadece alt işi olan ana işte) */}
        {hasChildren && (
          <button
            onClick={handleExpandToggle}
            className="mt-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
        {isSubJob && (
          <span className="text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5">└</span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 truncate">
              {job.is_no || `#${job.id}`}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {vadeDurumu === 'gecmis' && <AlertTriangle size={12} className="text-red-500" />}
              {vadeDurumu === 'yaklasan' && <Clock size={12} className="text-amber-500" />}
            </div>
          </div>

          {!isSubJob && (
            <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
              {[job.ilce_adi, job.mahalle_adi].filter(Boolean).join(' / ')}
              {job.ada && ` • ${job.ada}/${job.parsel}`}
            </div>
          )}

          {isSubJob && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {job.ada ? `Ada ${job.ada} / P ${job.parsel}` : [job.ilce_adi, job.mahalle_adi].filter(Boolean).join(' / ')}
            </div>
          )}

          {!isSubJob && job.is_turu_adi && (
            <div className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
              {job.is_turu_adi.split(',')[0].trim()}
              {job.is_turu_adi.includes(',') && ' +'}
            </div>
          )}

          {/* Alt iş sayısı */}
          {hasChildren && (
            <div className="text-[10px] text-gray-400 mt-0.5">
              {job._altIs_sayisi} alt iş
            </div>
          )}

          <IlerlemeBar
            tamamlanan={job.asama_tamamlanan || 0}
            toplam={job.asama_toplam || 0}
          />
        </div>
      </div>
    </button>
  )
}
