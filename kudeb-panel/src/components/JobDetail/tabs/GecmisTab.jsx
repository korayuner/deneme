import { Clock, RefreshCw, FileText, CheckSquare, Edit2, Trash2, MapPin, Upload, Plus } from 'lucide-react'
import { useLogs } from '../../../hooks/useLogs'
import LoadingSpinner from '../../common/LoadingSpinner'
import { formatDate } from '../../../utils/date'

const EYLEM_IKONLARI = {
  alan_duzenlendi: Edit2,
  asama_tamamlandi: CheckSquare,
  belge_eklendi: FileText,
  belge_silindi: Trash2,
  arazi_ziyareti: MapPin,
  yazi_yuklendi: Upload,
  is_olusturuldu: Plus,
}

const EYLEM_RENKLERI = {
  alan_duzenlendi: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  asama_tamamlandi: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
  belge_eklendi: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
  belge_silindi: 'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400',
  arazi_ziyareti: 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400',
  yazi_yuklendi: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
  is_olusturuldu: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
}

function LogSatiri({ log }) {
  const Icon = EYLEM_IKONLARI[log.eylem] || Clock
  const renkClass = EYLEM_RENKLERI[log.eylem] || 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'

  // Tarih ve saat
  const dt = log.date_created ? new Date(log.date_created) : null
  const tarih = dt ? dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
  const saat = dt ? dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div className="flex gap-3">
      {/* İkon */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${renkClass}`}>
        <Icon size={14} />
      </div>

      {/* İçerik */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-gray-800 dark:text-gray-200">{log.aciklama || log.eylem}</p>
          <span className="text-xs text-gray-400 flex-shrink-0">{tarih} {saat}</span>
        </div>

        {/* Değer değişikliği */}
        {(log.eski_deger || log.yeni_deger) && (
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {log.eski_deger && (
              <span className="line-through text-gray-400">{log.eski_deger}</span>
            )}
            {log.eski_deger && log.yeni_deger && (
              <span className="text-gray-300 dark:text-gray-600">→</span>
            )}
            {log.yeni_deger && (
              <span className="text-gray-600 dark:text-gray-300">{log.yeni_deger}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Günlere göre gruplama
function grupla(loglar) {
  const gruplar = {}
  loglar.forEach((log) => {
    const tarih = log.date_created ? new Date(log.date_created).toLocaleDateString('tr-TR', {
      day: '2-digit', month: 'long', year: 'numeric',
    }) : 'Tarih bilinmiyor'
    if (!gruplar[tarih]) gruplar[tarih] = []
    gruplar[tarih].push(log)
  })
  return Object.entries(gruplar)
}

export default function GecmisTab({ job }) {
  const { data: loglar = [], isLoading, refetch, isFetching } = useLogs(job.id)

  const gunGruplari = grupla(loglar)

  return (
    <div className="p-4 overflow-y-auto h-full scrollbar-thin">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Değişiklik Geçmişi
        </h3>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          title="Yenile"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading && <LoadingSpinner className="mt-8" />}

      {!isLoading && loglar.length === 0 && (
        <div className="text-center py-12">
          <Clock size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Henüz değişiklik kaydı yok</p>
        </div>
      )}

      {!isLoading && gunGruplari.length > 0 && (
        <div className="space-y-6">
          {gunGruplari.map(([tarih, gunLoglar]) => (
            <div key={tarih}>
              <div className="sticky top-0 bg-gray-50 dark:bg-gray-800/90 backdrop-blur-sm py-1 mb-3 z-10">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {tarih}
                </span>
              </div>
              <div className="space-y-0">
                {gunLoglar.map((log) => (
                  <LogSatiri key={log.id} log={log} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
