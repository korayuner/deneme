import { useState } from 'react'
import {
  MapPin, Plus, ChevronDown, ChevronUp, Trash2, Loader2,
  Camera, Edit2, Check, X,
} from 'lucide-react'
import {
  useAraziZiyaretleri, useCreateAraziZiyareti, useUpdateAraziZiyareti,
  useDeleteAraziZiyareti,
} from '../../../hooks/useArazi'
import { formatDate } from '../../../utils/date'
import LoadingSpinner from '../../common/LoadingSpinner'

// Yeni ziyaret formu
function YeniZiyaretForm({ isId, onKapat }) {
  const [form, setForm] = useState({
    tarih: new Date().toISOString().split('T')[0],
    notlar: '',
    gorevli_personel: '',
  })
  const { mutateAsync: create, isPending } = useCreateAraziZiyareti()

  const handleKaydet = async (e) => {
    e.preventDefault()
    if (!form.tarih) return
    await create({ ...form, is_id: isId })
    onKapat()
  }

  return (
    <form onSubmit={handleKaydet} className="border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3 bg-blue-50/30 dark:bg-blue-900/10">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Yeni Arazi Ziyareti</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Tarih *</label>
          <input
            type="date"
            value={form.tarih}
            onChange={(e) => setForm({ ...form, tarih: e.target.value })}
            required
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Görevli Personel</label>
          <input
            type="text"
            value={form.gorevli_personel}
            onChange={(e) => setForm({ ...form, gorevli_personel: e.target.value })}
            placeholder="Ad Soyad"
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">Notlar</label>
        <textarea
          value={form.notlar}
          onChange={(e) => setForm({ ...form, notlar: e.target.value })}
          rows={3}
          placeholder="Ziyaret notları, gözlemler..."
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending || !form.tarih}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Kaydet
        </button>
        <button
          type="button"
          onClick={onKapat}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          İptal
        </button>
      </div>
    </form>
  )
}

// Ziyaret düzenleme (satır içi)
function ZiyaretDuzenle({ ziyaret, isId, onKapat }) {
  const [form, setForm] = useState({
    tarih: ziyaret.tarih || '',
    notlar: ziyaret.notlar || '',
    gorevli_personel: ziyaret.gorevli_personel || '',
  })
  const { mutateAsync: update, isPending } = useUpdateAraziZiyareti()

  const handleKaydet = async () => {
    await update({ id: ziyaret.id, data: form, isId })
    onKapat()
  }

  return (
    <div className="space-y-2 mt-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Tarih</label>
          <input
            type="date"
            value={form.tarih}
            onChange={(e) => setForm({ ...form, tarih: e.target.value })}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Personel</label>
          <input
            type="text"
            value={form.gorevli_personel}
            onChange={(e) => setForm({ ...form, gorevli_personel: e.target.value })}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <textarea
        value={form.notlar}
        onChange={(e) => setForm({ ...form, notlar: e.target.value })}
        rows={3}
        className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={handleKaydet}
          disabled={isPending}
          className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Kaydet
        </button>
        <button onClick={onKapat} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          İptal
        </button>
      </div>
    </div>
  )
}

// Tek ziyaret kartı
function ZiyaretKarti({ ziyaret, isId }) {
  const [acik, setAcik] = useState(false)
  const [duzenleniyor, setDuzenleniyor] = useState(false)
  const [silOnay, setSilOnay] = useState(false)
  const { mutateAsync: deleteZiyaret, isPending: siliniyor } = useDeleteAraziZiyareti()

  const handleSil = async () => {
    await deleteZiyaret({ id: ziyaret.id, isId })
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Başlık */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={() => !duzenleniyor && setAcik(!acik)}
      >
        <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <MapPin size={15} className="text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {ziyaret.tarih ? formatDate(ziyaret.tarih) : 'Tarih yok'}
          </p>
          {ziyaret.gorevli_personel && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{ziyaret.gorevli_personel}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!silOnay ? (
            <button
              onClick={(e) => { e.stopPropagation(); setSilOnay(true) }}
              className="p-1 text-gray-300 hover:text-red-400 rounded transition-colors"
            >
              <Trash2 size={13} />
            </button>
          ) : (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleSil}
                disabled={siliniyor}
                className="text-xs px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {siliniyor ? '...' : 'Sil'}
              </button>
              <button onClick={() => setSilOnay(false)} className="text-xs px-1.5 py-0.5 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setDuzenleniyor(!duzenleniyor) }}
            className="p-1 text-gray-300 hover:text-blue-400 rounded transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button className="p-1 text-gray-400">
            {acik ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Genişletilmiş içerik */}
      {(acik || duzenleniyor) && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700">
          {duzenleniyor ? (
            <ZiyaretDuzenle
              ziyaret={ziyaret}
              isId={isId}
              onKapat={() => setDuzenleniyor(false)}
            />
          ) : (
            <div className="mt-2 space-y-2">
              {ziyaret.notlar && (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                  {ziyaret.notlar}
                </p>
              )}
              {!ziyaret.notlar && (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">Not yok</p>
              )}
              {/* Fotoğraf bölümü (mobil entegrasyonuna kadar bilgi mesajı) */}
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 dark:text-gray-500">
                <Camera size={12} />
                Fotoğraflar mobil uygulama entegrasyonu ile eklenecek
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AraziTab({ job }) {
  const { data: ziyaretler = [], isLoading } = useAraziZiyaretleri(job.id)
  const [yeniFormAcik, setYeniFormAcik] = useState(false)

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4 scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Arazi Ziyaretleri ({ziyaretler.length})
        </h3>
        {!yeniFormAcik && (
          <button
            onClick={() => setYeniFormAcik(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800 transition-colors"
          >
            <Plus size={12} /> Yeni Ziyaret
          </button>
        )}
      </div>

      {/* Yeni form */}
      {yeniFormAcik && (
        <YeniZiyaretForm isId={job.id} onKapat={() => setYeniFormAcik(false)} />
      )}

      {isLoading && <LoadingSpinner className="mt-8" />}

      {!isLoading && ziyaretler.length === 0 && !yeniFormAcik && (
        <div className="text-center py-10">
          <MapPin size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Henüz arazi ziyareti kaydedilmedi</p>
        </div>
      )}

      {!isLoading && ziyaretler.length > 0 && (
        <div className="space-y-2">
          {ziyaretler.map((z) => (
            <ZiyaretKarti key={z.id} ziyaret={z} isId={job.id} />
          ))}
        </div>
      )}
    </div>
  )
}
