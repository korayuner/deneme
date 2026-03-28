import { useState } from 'react'
import { CheckCircle2, Circle, Plus, Trash2, Loader2, ChevronDown, RefreshCw } from 'lucide-react'
import { useAsamalar, useCreateAsamalar, useTamamlaAsama, useAddAsamaAdimi, useDeleteAsamaAdimi } from '../../../hooks/useAsamalar'
import { ilerlemeHesapla } from '../../../utils/constants'
import LoadingSpinner from '../../common/LoadingSpinner'
import { formatDate } from '../../../utils/date'

function AsamaItem({ asama, isId, onTamamla, onSil }) {
  const [not, setNot] = useState(asama.not || '')
  const [notAcik, setNotAcik] = useState(false)
  const [silOnay, setSilOnay] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const handleTamamla = async () => {
    setKaydediliyor(true)
    try {
      await onTamamla(asama.id, !asama.tamamlandi, not)
    } finally {
      setKaydediliyor(false)
    }
  }

  const handleNotKaydet = async () => {
    setKaydediliyor(true)
    try {
      await onTamamla(asama.id, asama.tamamlandi, not)
      setNotAcik(false)
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div className={`rounded-lg border transition-colors ${
      asama.tamamlandi
        ? 'border-green-200 dark:border-green-900/40 bg-green-50/50 dark:bg-green-900/10'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
    }`}>
      <div className="flex items-start gap-3 p-3">
        {/* Tamamla butonu */}
        <button
          onClick={handleTamamla}
          disabled={kaydediliyor}
          className="flex-shrink-0 mt-0.5"
        >
          {kaydediliyor ? (
            <Loader2 size={18} className="animate-spin text-gray-400" />
          ) : asama.tamamlandi ? (
            <CheckCircle2 size={18} className="text-green-500" />
          ) : (
            <Circle size={18} className="text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm ${
              asama.tamamlandi
                ? 'line-through text-gray-400 dark:text-gray-500'
                : 'text-gray-800 dark:text-gray-200'
            }`}>
              {asama.asama_adi}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {asama.tamamlandi && asama.tamamlanma_tarihi && (
                <span className="text-xs text-gray-400">{formatDate(asama.tamamlanma_tarihi)}</span>
              )}
              <button
                onClick={() => setNotAcik(!notAcik)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                title="Not ekle"
              >
                <ChevronDown size={14} className={`transition-transform ${notAcik ? 'rotate-180' : ''}`} />
              </button>
              {!silOnay ? (
                <button
                  onClick={() => setSilOnay(true)}
                  className="p-1 text-gray-300 hover:text-red-400 rounded transition-colors"
                  title="Sil"
                >
                  <Trash2 size={13} />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSil(asama.id)}
                    className="text-xs px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Sil
                  </button>
                  <button
                    onClick={() => setSilOnay(false)}
                    className="text-xs px-1.5 py-0.5 text-gray-400 hover:text-gray-600"
                  >
                    İptal
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Not alanı */}
          {notAcik && (
            <div className="mt-2 space-y-1">
              <textarea
                value={not}
                onChange={(e) => setNot(e.target.value)}
                placeholder="Not ekle..."
                rows={2}
                className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleNotKaydet}
                disabled={kaydediliyor}
                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
              >
                Kaydet
              </button>
            </div>
          )}
          {!notAcik && asama.not && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">{asama.not}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AsamaTab({ job }) {
  const { data: asamalar = [], isLoading, refetch } = useAsamalar(job.id)
  const { mutateAsync: createAsamalar, isPending: olusturuluyor } = useCreateAsamalar()
  const { mutateAsync: tamamlaAsama } = useTamamlaAsama()
  const { mutateAsync: addAdim, isPending: ekleniyor } = useAddAsamaAdimi()
  const { mutateAsync: deleteAdim } = useDeleteAsamaAdimi()

  const [yeniAdim, setYeniAdim] = useState('')
  const [adimEkleAcik, setAdimEkleAcik] = useState(false)

  const pct = job.asama_toplam > 0
    ? ilerlemeHesapla(job.asama_tamamlanan, job.asama_toplam)
    : 0

  const handleSablonOlustur = () => {
    createAsamalar({ isId: job.id, isTurleri: job.is_turu_adi })
  }

  const handleTamamla = async (asamaId, tamamlandi, not) => {
    await tamamlaAsama({ asamaId, isId: job.id, isTamamlandi: tamamlandi, aciklama: not })
  }

  const handleSil = async (asamaId) => {
    await deleteAdim({ asamaId, isId: job.id })
  }

  const handleAdimEkle = async (e) => {
    e.preventDefault()
    const ad = yeniAdim.trim()
    if (!ad) return
    const enSonSira = asamalar.length > 0 ? Math.max(...asamalar.map((a) => a.sira || 0)) : 0
    await addAdim({ isId: job.id, asamaAdi: ad, enSonSira })
    setYeniAdim('')
    setAdimEkleAcik(false)
  }

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4 scrollbar-thin">
      {/* İlerleme */}
      {job.asama_toplam > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">İlerleme</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-400">{job.asama_tamamlanan} / {job.asama_toplam} aşama tamamlandı</span>
            <button
              onClick={() => refetch()}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Yenile"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Aşama listesi */}
      {isLoading && <LoadingSpinner className="mt-8" />}

      {!isLoading && asamalar.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Bu iş için henüz aşama tanımlanmadı.
          </p>
          <button
            onClick={handleSablonOlustur}
            disabled={olusturuluyor}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {olusturuluyor ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            İş Türüne Göre Aşama Oluştur
          </button>
        </div>
      )}

      {!isLoading && asamalar.length > 0 && (
        <div className="space-y-2">
          {asamalar.map((asama) => (
            <AsamaItem
              key={asama.id}
              asama={asama}
              isId={job.id}
              onTamamla={handleTamamla}
              onSil={handleSil}
            />
          ))}
        </div>
      )}

      {/* Adım ekle */}
      {asamalar.length > 0 && (
        <div>
          {!adimEkleAcik ? (
            <button
              onClick={() => setAdimEkleAcik(true)}
              className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
            >
              <Plus size={14} /> Adım Ekle
            </button>
          ) : (
            <form onSubmit={handleAdimEkle} className="flex gap-2">
              <input
                type="text"
                value={yeniAdim}
                onChange={(e) => setYeniAdim(e.target.value)}
                placeholder="Yeni adım adı..."
                autoFocus
                className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!yeniAdim.trim() || ekleniyor}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {ekleniyor ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Ekle
              </button>
              <button
                type="button"
                onClick={() => { setAdimEkleAcik(false); setYeniAdim('') }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                İptal
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
