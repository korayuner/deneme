import { useState } from 'react'
import { Plus, Loader2, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { useSubJobs, useCreateJob, useNextIsNo } from '../../../hooks/useJobs'
import useStore from '../../../store/useStore'
import { ilerlemeHesapla } from '../../../utils/constants'
import { getVadeDurumu } from '../../../utils/date'
import LoadingSpinner from '../../common/LoadingSpinner'

function AltIsKarti({ job, isSelected, onClick }) {
  const pct = job.asama_toplam > 0 ? ilerlemeHesapla(job.asama_tamamlanan, job.asama_toplam) : null
  const vadeDurumu = getVadeDurumu(job.vade_tarihi)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400">
              {job.is_no}
            </span>
            {vadeDurumu === 'gecmis' && <AlertTriangle size={13} className="text-red-500" />}
            {vadeDurumu === 'yaklasan' && <Clock size={13} className="text-amber-500" />}
          </div>
          {(job.ada || job.parsel) && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Ada {job.ada} / Parsel {job.parsel}
            </p>
          )}
        </div>
        {pct !== null && (
          <div className="flex-shrink-0 text-right">
            {pct === 100 ? (
              <CheckCircle2 size={16} className="text-green-500" />
            ) : (
              <span className="text-xs text-gray-400">{pct}%</span>
            )}
          </div>
        )}
      </div>

      {pct !== null && (
        <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </button>
  )
}

export default function AltIslerTab({ job }) {
  const { data: altIsler = [], isLoading } = useSubJobs(job.id)
  const { mutateAsync: createJob, isPending: olusturuluyor } = useCreateJob()
  const { data: nextIsNo } = useNextIsNo(job.is_no)
  const { setSelectedJobId, setActiveTab, selectedJobId } = useStore()

  const handleYeniAltIs = async () => {
    const is_no = nextIsNo || `${job.is_no}-A01`
    const yeni = await createJob({
      is_no,
      parent_id: job.id,
      ilce_adi: job.ilce_adi,
      mahalle_adi: job.mahalle_adi,
      is_turu_adi: job.is_turu_adi,
    })
    if (yeni?.id) {
      setSelectedJobId(yeni.id)
      setActiveTab('ozet')
    }
  }

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4 scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Alt İşler ({altIsler.length})
        </h3>
        <button
          onClick={handleYeniAltIs}
          disabled={olusturuluyor}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800 transition-colors disabled:opacity-50"
        >
          {olusturuluyor ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Yeni Alt İş
          {nextIsNo && <span className="font-mono text-green-500">({nextIsNo})</span>}
        </button>
      </div>

      {isLoading && <LoadingSpinner className="mt-8" />}

      {!isLoading && altIsler.length === 0 && (
        <div className="text-center py-10">
          <p className="text-sm text-gray-400">Bu işe bağlı alt iş yok.</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
            Birden fazla parsel/taşınmaz içeren işlerde alt iş oluşturun.
          </p>
        </div>
      )}

      {!isLoading && altIsler.length > 0 && (
        <div className="space-y-2">
          {altIsler.map((altIs) => (
            <AltIsKarti
              key={altIs.id}
              job={altIs}
              isSelected={selectedJobId === altIs.id}
              onClick={() => {
                setSelectedJobId(altIs.id)
                setActiveTab('ozet')
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
