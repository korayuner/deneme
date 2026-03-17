import { FileText, AlertTriangle, Clock } from 'lucide-react'
import clsx from 'clsx'
import { getVadeDurumu } from '../../utils/date'

export default function JobListItem({ job, isSelected, onClick }) {
  const vadeDurumu = getVadeDurumu(job.vade_tarihi)

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors',
        isSelected && 'bg-blue-50 dark:bg-gray-700 border-l-2 border-l-blue-500',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 truncate">
          {job.is_no || `#${job.id}`}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {vadeDurumu === 'gecmis' && <AlertTriangle size={12} className="text-red-500" />}
          {vadeDurumu === 'yaklasan' && <Clock size={12} className="text-amber-500" />}
          {job.belge_sayisi > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <FileText size={11} />{job.belge_sayisi}
            </span>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
        {[job.ilce_adi, job.mahalle_adi].filter(Boolean).join(' / ')}
        {job.ada && ` • ${job.ada}/${job.parsel}`}
      </div>

      {job.is_turu_adi && (
        <div className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
          {job.is_turu_adi}
        </div>
      )}

      {job.gorevli_personel && (
        <div className="text-xs text-gray-400 truncate">
          👤 {job.gorevli_personel}
        </div>
      )}
    </button>
  )
}
