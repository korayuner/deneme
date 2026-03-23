import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext,
  sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  FileText, Upload, ExternalLink, GripVertical,
  Loader2, Calendar, Tag, Trash2, CheckCircle, X,
  Brain, AlertCircle,
} from 'lucide-react'
import { useJobBelgeler, useAiUpload, useDeleteBelge } from '../../../hooks/useDocuments'
import { getPaperlessDocumentUrl } from '../../../api/paperless'
import { formatDate } from '../../../utils/date'
import LoadingSpinner from '../../common/LoadingSpinner'

// ─── Belge satırı ───────────────────────────────────────────────────────────

function BelgeSatiri({ belge, is_no }) {
  const { mutate: sil, isPending } = useDeleteBelge(is_no)

  const turRenk = {
    Gelen: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    Giden: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    Ek:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
      {/* İkon */}
      <div className="w-8 h-10 flex-shrink-0 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center mt-0.5">
        <FileText size={16} className="text-red-400" />
      </div>

      {/* Bilgi */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={belge.dosya_adi}>
          {belge.dosya_adi}
        </p>
        {belge.konu && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{belge.konu}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {belge.tur && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${turRenk[belge.tur] || turRenk.Ek}`}>
              {belge.tur}
            </span>
          )}
          {belge.kimden && (
            <span className="text-xs text-gray-400 truncate max-w-[140px]">{belge.kimden}</span>
          )}
          {belge.tarih && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar size={10} /> {formatDate(belge.tarih)}
            </span>
          )}
        </div>
      </div>

      {/* Aksiyonlar */}
      <div className="flex gap-1 flex-shrink-0">
        {belge.paperless_id && (
          <a
            href={getPaperlessDocumentUrl(belge.paperless_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="Paperless'ta aç"
          >
            <ExternalLink size={14} />
          </a>
        )}
        <button
          onClick={() => sil(belge.id)}
          disabled={isPending}
          className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
          title="Sil"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── AI Analiz Sonucu Paneli ─────────────────────────────────────────────────

function AnalizPaneli({ analiz, onKapat }) {
  if (!analiz) return null

  const alanlar = [
    { label: 'Sayı',         deger: analiz.sayi },
    { label: 'Tarih',        deger: analiz.tarih },
    { label: 'Kimden',       deger: analiz.kimden },
    { label: 'Konu',         deger: analiz.konu },
    { label: 'Vade Tarihi',  deger: analiz.vade_tarihi },
    { label: 'Ekler',        deger: analiz.ekler },
  ]

  return (
    <div className="border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20 p-4 mb-3">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <Brain size={16} />
          <span className="text-sm font-medium">AI Analiz Tamamlandı</span>
        </div>
        <button onClick={onKapat} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      {/* Alanlar */}
      <div className="space-y-1.5 mb-3">
        {alanlar.filter(a => a.deger).map(({ label, deger }) => (
          <div key={label} className="flex gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">{label}:</span>
            <span className="text-gray-800 dark:text-gray-200">{deger}</span>
          </div>
        ))}
      </div>

      {/* Özet */}
      {analiz.ozet && (
        <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Özet (Gemini):</p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{analiz.ozet}</p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <CheckCircle size={12} />
        <span>Belge Directus ve Paperless'a kaydedildi</span>
      </div>
    </div>
  )
}

// ─── Yükleme Alanı ───────────────────────────────────────────────────────────

function AiDropZone({ job, onAnalysisReady }) {
  const [progress, setProgress] = useState(0)
  const [durum, setDurum] = useState('idle') // idle | uploading | analyzing | done | error

  const { mutate: yukle, isPending } = useAiUpload(job, {
    onAnalysisReady: (analiz) => {
      setDurum('done')
      setProgress(100)
      if (onAnalysisReady) onAnalysisReady(analiz)
    },
  })

  const onDrop = useCallback((files) => {
    if (!files.length) return
    setDurum('uploading')
    setProgress(0)

    yukle({
      file: files[0],
      onProgress: (pct) => {
        setProgress(pct)
        if (pct === 100) setDurum('analyzing')
      },
    })
  }, [yukle])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
    disabled: isPending,
  })

  const durumMetni = {
    idle:      'PDF veya Word sürükleyin / tıklayın',
    uploading: `Yükleniyor... %${progress}`,
    analyzing: 'Gemini analiz ediyor...',
    done:      'Tamamlandı — yeni belge yükleyebilirsiniz',
    error:     'Hata oluştu — tekrar deneyin',
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : durum === 'done'
            ? 'border-green-300 bg-green-50 dark:bg-green-900/10'
            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      } ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />

      {isPending ? (
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{durumMetni[durum]}</p>
          {durum === 'uploading' && (
            <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {durum === 'analyzing' && (
            <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400">
              <Brain size={12} /> AI analiz yapıyor...
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {durum === 'done'
            ? <CheckCircle size={22} className="text-green-500" />
            : <Upload size={22} className="text-gray-400" />
          }
          <p className="text-sm text-gray-600 dark:text-gray-400">{durumMetni[durum]}</p>
          {durum === 'idle' && (
            <p className="text-xs text-purple-500 dark:text-purple-400 flex items-center gap-1">
              <Brain size={11} /> AI ile otomatik analiz edilir
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

export default function DocumentsTab({ job }) {
  const [sonAnaliz, setSonAnaliz] = useState(null)

  const { data: belgeler = [], isLoading, isError } = useJobBelgeler(job.is_no)

  if (!job.is_no) {
    return (
      <div className="p-8 text-center text-gray-400">
        <AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">İş numarası olmadan belgeler listelenemiyor</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Yükleme alanı */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <AiDropZone job={job} onAnalysisReady={setSonAnaliz} />
        {sonAnaliz && (
          <AnalizPaneli analiz={sonAnaliz} onKapat={() => setSonAnaliz(null)} />
        )}
      </div>

      {/* Belge listesi */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {isLoading && <LoadingSpinner className="mt-6" />}
        {isError && (
          <p className="text-sm text-red-500 text-center mt-4">Belgeler yüklenemedi</p>
        )}

        {!isLoading && belgeler.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <FileText size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Henüz belge yok</p>
            <p className="text-xs mt-1 text-gray-300">Yukarıya PDF sürükleyin</p>
          </div>
        )}

        {belgeler.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-2">
              {belgeler.length} belge — sadece bu işe ait
            </p>
            {belgeler.map((belge) => (
              <BelgeSatiri key={belge.id} belge={belge} is_no={job.is_no} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
