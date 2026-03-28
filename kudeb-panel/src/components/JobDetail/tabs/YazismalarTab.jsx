import { useState } from 'react'
import {
  FileText, Plus, Trash2, ExternalLink, AlertTriangle, ChevronDown,
  ChevronUp, Loader2, Edit2, X, Check, Paperclip,
} from 'lucide-react'
import { useBelgeler, useDeleteBelge, useUpdateBelge } from '../../../hooks/useBelgeler'
import { useBelgeEkleri } from '../../../hooks/useBelgeler'
import { BELGE_TUR_RENK, BELGE_TURLER } from '../../../utils/constants'
import { formatDate } from '../../../utils/date'
import LoadingSpinner from '../../common/LoadingSpinner'

// Belge düzenleme formu (küçük, inline)
function BelgeDuzenleForm({ belge, isId, onKapat }) {
  const [form, setForm] = useState({
    konu: belge.konu || '',
    kimden: belge.kimden || '',
    kime: belge.kime || '',
    tarih: belge.tarih || '',
    sayi: belge.sayi || '',
    tur: belge.tur || 'Gelen',
  })
  const { mutateAsync: updateBelge, isPending } = useUpdateBelge()

  const handleKaydet = async () => {
    await updateBelge({ belgeId: belge.id, data: form, isId })
    onKapat()
  }

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2 mt-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Tür</label>
          <select
            value={form.tur}
            onChange={(e) => setForm({ ...form, tur: e.target.value })}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {BELGE_TURLER.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Tarih</label>
          <input
            type="date"
            value={form.tarih}
            onChange={(e) => setForm({ ...form, tarih: e.target.value })}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">Kimden</label>
        <input
          type="text"
          value={form.kimden}
          onChange={(e) => setForm({ ...form, kimden: e.target.value })}
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">Konu</label>
        <input
          type="text"
          value={form.konu}
          onChange={(e) => setForm({ ...form, konu: e.target.value })}
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">Sayı / Evrak No</label>
        <input
          type="text"
          value={form.sayi}
          onChange={(e) => setForm({ ...form, sayi: e.target.value })}
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleKaydet}
          disabled={isPending}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Kaydet
        </button>
        <button
          onClick={onKapat}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          İptal
        </button>
      </div>
    </div>
  )
}

// Ek listesi
function BelgeEkler({ belgeId }) {
  const { data: ekler = [], isLoading } = useBelgeEkleri(belgeId)

  if (isLoading) return <Loader2 size={12} className="animate-spin text-gray-400" />
  if (ekler.length === 0) return null

  return (
    <div className="mt-2 space-y-1">
      {ekler.map((ek) => (
        <a
          key={ek.id}
          href={ek.dosya_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Paperclip size={11} />
          {ek.dosya_adi || 'Ek dosya'}
        </a>
      ))}
    </div>
  )
}

// Tek belge kartı
function BelgeKarti({ belge, isId }) {
  const [acik, setAcik] = useState(false)
  const [duzenleniyor, setDuzenleniyor] = useState(false)
  const [silOnay, setSilOnay] = useState(false)
  const { mutateAsync: deleteBelge, isPending: siliniyor } = useDeleteBelge()

  const turRenk = BELGE_TUR_RENK[belge.tur] || BELGE_TUR_RENK['Diğer']

  const handleSil = async () => {
    await deleteBelge({ belgeId: belge.id, isId })
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Başlık satırı */}
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={() => !duzenleniyor && setAcik(!acik)}
      >
        <div className="flex-shrink-0 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${turRenk}`}>
            {belge.tur || 'Belge'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
            {belge.konu || belge.dosya_adi || 'Konu belirtilmedi'}
          </p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
            {belge.kimden && <span>{belge.kimden}</span>}
            {belge.tarih && <span>{formatDate(belge.tarih)}</span>}
            {belge.sayi && <span>{belge.sayi}</span>}
          </div>
          {belge.uyari && (
            <div className="flex items-center gap-1 mt-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle size={11} />
              {belge.uyari}
            </div>
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
              <button
                onClick={() => setSilOnay(false)}
                className="text-xs px-1.5 py-0.5 text-gray-400 hover:text-gray-600"
              >
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
      {acik && !duzenleniyor && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100 dark:border-gray-700">
          {belge.ozet && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-line leading-relaxed">
              {belge.ozet}
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            {belge.paperless_id && (
              <a
                href={`/paperless/documents/${belge.paperless_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink size={11} /> Paperless'ta aç
              </a>
            )}
          </div>
          <BelgeEkler belgeId={belge.id} />
        </div>
      )}

      {/* Düzenleme formu */}
      {duzenleniyor && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700">
          <BelgeDuzenleForm
            belge={belge}
            isId={isId}
            onKapat={() => setDuzenleniyor(false)}
          />
        </div>
      )}
    </div>
  )
}

export default function YazismalarTab({ job }) {
  const { data: belgeler = [], isLoading } = useBelgeler(job.id)

  const gelens = belgeler.filter((b) => b.tur === 'Gelen')
  const gidens = belgeler.filter((b) => b.tur === 'Giden')
  const raporlar = belgeler.filter((b) => b.tur === 'Teknik Rapor')
  const kararlar = belgeler.filter((b) => b.tur === 'Kurul Kararı')
  const diger = belgeler.filter((b) => !['Gelen', 'Giden', 'Teknik Rapor', 'Kurul Kararı'].includes(b.tur))

  const gruplar = [
    { label: 'Gelen', items: gelens },
    { label: 'Giden', items: gidens },
    { label: 'Teknik Rapor', items: raporlar },
    { label: 'Kurul Kararı', items: kararlar },
    { label: 'Diğer', items: diger },
  ].filter((g) => g.items.length > 0)

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4 scrollbar-thin">
      {isLoading && <LoadingSpinner className="mt-8" />}

      {!isLoading && belgeler.length === 0 && (
        <div className="text-center py-12">
          <FileText size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Henüz yazışma yok</p>
          <p className="text-xs text-gray-400 mt-1">
            Sol panelden "Yazı Yükle" ile belge ekleyebilirsiniz.
          </p>
        </div>
      )}

      {!isLoading && gruplar.map(({ label, items }) => (
        <div key={label}>
          <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            {label} ({items.length})
          </h3>
          <div className="space-y-2">
            {items.map((belge) => (
              <BelgeKarti key={belge.id} belge={belge} isId={job.id} />
            ))}
          </div>
        </div>
      ))}

      {!isLoading && belgeler.length > 0 && (
        <div className="pt-2 text-xs text-gray-400 text-right border-t border-gray-100 dark:border-gray-700">
          Toplam {belgeler.length} belge
        </div>
      )}
    </div>
  )
}
