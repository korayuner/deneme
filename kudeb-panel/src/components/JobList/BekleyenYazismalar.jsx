import { useState } from 'react'
import { X, Bell, AlertTriangle, MapPin, ArrowRight, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getBekleyenBelgeler, updateBelge } from '../../api/directus'
import { useJobs } from '../../hooks/useJobs'
import useStore from '../../store/useStore'
import { formatDate } from '../../utils/date'

function BelgeKarti({ belge, jobs, onBagla }) {
  const [seciliIsId, setSeciliIsId] = useState(null)
  const [baglaniyor, setBaglaniyor] = useState(false)

  // Otomatik öneri: ada/parsel eşleşmesi
  const onerilenIsler = jobs.filter((j) => {
    if (!belge.ada && !belge.parsel) return false
    return (belge.ada && j.ada === belge.ada) || (belge.parsel && j.parsel === belge.parsel)
  }).slice(0, 3)

  const handleBagla = async () => {
    if (!seciliIsId) return
    setBaglaniyor(true)
    try {
      await onBagla(belge.id, seciliIsId)
    } finally {
      setBaglaniyor(false)
    }
  }

  return (
    <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-3 bg-amber-50/50 dark:bg-amber-900/10 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{belge.dosya_adi}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {belge.kimden && `${belge.kimden} · `}
            {belge.tarih ? formatDate(belge.tarih) : 'Tarih yok'}
          </p>
        </div>
        <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
          {belge.tur || 'Belge'}
        </span>
      </div>

      {belge.konu && (
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{belge.konu}</p>
      )}

      {(belge.ada || belge.ilce) && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <MapPin size={11} />
          {[belge.ilce, belge.mahalle].filter(Boolean).join(' / ')}
          {belge.ada && ` • Ada ${belge.ada}`}
          {belge.parsel && ` / Parsel ${belge.parsel}`}
        </div>
      )}

      {/* Önerilen işler */}
      {onerilenIsler.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Önerilen işler:</p>
          <div className="flex flex-wrap gap-1">
            {onerilenIsler.map((j) => (
              <button
                key={j.id}
                onClick={() => setSeciliIsId(j.id)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  seciliIsId === j.id
                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 text-gray-600 dark:text-gray-400'
                }`}
              >
                {j.is_no}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* İş seç dropdown */}
      <select
        value={seciliIsId || ''}
        onChange={(e) => setSeciliIsId(e.target.value ? Number(e.target.value) : null)}
        className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">İş seçin...</option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.is_no} — {[j.ilce_adi, j.mahalle_adi].filter(Boolean).join(' / ')}
            {j.ada ? ` • Ada ${j.ada}` : ''}
          </option>
        ))}
      </select>

      <button
        onClick={handleBagla}
        disabled={!seciliIsId || baglaniyor}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
      >
        {baglaniyor ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
        İşe Bağla
      </button>
    </div>
  )
}

export default function BekleyenYazismalar({ onClose }) {
  const { setSelectedJobId, setActiveTab } = useStore()

  const { data: bekleyenler = [], isLoading, refetch } = useQuery({
    queryKey: ['bekleyen-belgeler'],
    queryFn: getBekleyenBelgeler,
  })

  const { data: jobs = [] } = useJobs({})

  const handleBagla = async (belgeId, isId) => {
    await updateBelge(belgeId, {}, [isId])
    await refetch()
    // İşe git
    setSelectedJobId(isId)
    setActiveTab('yazismalar')
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-amber-500" />
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">
                Bekleyen Yazışmalar
              </h2>
              {bekleyenler.length > 0 && (
                <span className="ml-1 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                  {bekleyenler.length}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            )}

            {!isLoading && bekleyenler.length === 0 && (
              <div className="text-center py-12">
                <Bell size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Bekleyen yazışma yok</p>
                <p className="text-xs text-gray-400 mt-1">
                  Yüklenen tüm belgeler işlere bağlandı.
                </p>
              </div>
            )}

            {!isLoading && bekleyenler.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                  <AlertTriangle size={14} />
                  Bu belgeler otomatik olarak bir işe eşleştirilemedi. Lütfen elle bağlayın.
                </div>
                {bekleyenler.map((belge) => (
                  <BelgeKarti
                    key={belge.id}
                    belge={belge}
                    jobs={jobs}
                    onBagla={handleBagla}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
