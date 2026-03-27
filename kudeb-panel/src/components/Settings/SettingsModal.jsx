import { useState, useRef, useEffect } from 'react'
import { X, UserPlus, Trash2, Settings, Users, Briefcase, Plus, Loader2 } from 'lucide-react'
import { usePersoneller, useAddPersonel, useDeletePersonel, useIsTurleri, useAddIsTuru, useDeleteIsTuru } from '../../hooks/usePersonel'

function PersonelListesi() {
  const { data: personeller = [], isLoading } = usePersoneller()
  const { mutate: ekle, isPending: ekleniyor } = useAddPersonel()
  const { mutate: sil } = useDeletePersonel()
  const [yeniAd, setYeniAd] = useState('')
  const inputRef = useRef(null)

  const handleEkle = (e) => {
    e.preventDefault()
    const ad = yeniAd.trim()
    if (!ad) return
    ekle(ad, { onSuccess: () => setYeniAd('') })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      {/* Yeni kişi ekle */}
      <form onSubmit={handleEkle} className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          type="text"
          value={yeniAd}
          onChange={(e) => setYeniAd(e.target.value)}
          placeholder="Ad Soyad"
          className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!yeniAd.trim() || ekleniyor}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {ekleniyor ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Ekle
        </button>
      </form>

      {/* Liste */}
      {personeller.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Henüz kişi eklenmemiş</p>
      ) : (
        <ul className="space-y-1">
          {personeller.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors"
            >
              <span className="text-sm text-gray-800 dark:text-gray-200">{p.ad}</span>
              <button
                onClick={() => sil(p.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all rounded"
                title="Sil"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-gray-400 text-right">{personeller.length} kişi</p>
    </div>
  )
}

function IsTurleriListesi() {
  const { data: turler = [], isLoading } = useIsTurleri()
  const { mutate: ekle, isPending: ekleniyor } = useAddIsTuru()
  const { mutate: sil } = useDeleteIsTuru()
  const [yeniAd, setYeniAd] = useState('')

  const handleEkle = (e) => {
    e.preventDefault()
    const ad = yeniAd.trim()
    if (!ad) return
    ekle(ad, { onSuccess: () => setYeniAd('') })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-4">
        Bir iş birden fazla tür içerebilir. Türler iş detayında çoklu seçim ile atanır.
      </p>

      <form onSubmit={handleEkle} className="flex gap-2 mb-4">
        <input
          type="text"
          value={yeniAd}
          onChange={(e) => setYeniAd(e.target.value)}
          placeholder="İş türü adı"
          className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!yeniAd.trim() || ekleniyor}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {ekleniyor ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Ekle
        </button>
      </form>

      {turler.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Henüz iş türü eklenmemiş</p>
      ) : (
        <ul className="space-y-1">
          {turler.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors"
            >
              <span className="text-sm text-gray-800 dark:text-gray-200">{t.ad}</span>
              <button
                onClick={() => sil(t.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all rounded"
                title="Sil"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-gray-400 text-right">{turler.length} tür</p>
    </div>
  )
}

const TABS = [
  { id: 'personel', label: 'Görevli Kişiler', icon: Users },
  { id: 'is_turleri', label: 'İş Türleri', icon: Briefcase },
]

export default function SettingsModal({ onClose }) {
  const [aktifTab, setAktifTab] = useState('personel')

  // ESC ile kapat
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Ayarlar</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setAktifTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  aktifTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto p-5">
          {aktifTab === 'personel' && <PersonelListesi />}
          {aktifTab === 'is_turleri' && <IsTurleriListesi />}
        </div>
      </div>
    </>
  )
}
