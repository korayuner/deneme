import { useState, useEffect } from 'react'
import {
  X, Settings, Users, Briefcase, Cpu, Key, CheckSquare, Info,
  UserPlus, Trash2, Plus, Loader2, Save, ChevronDown, ChevronRight,
} from 'lucide-react'
import {
  usePersoneller, useAddPersonel, useDeletePersonel,
  useIsTurleri, useAddIsTuru, useDeleteIsTuru,
} from '../../hooks/usePersonel'
import { useAyarlar, useSetAyarlar, useAsamaSablonlari, useSaveAsamaSablonu } from '../../hooks/useAyarlar'
import { ASAMA_SABLONLARI, VARSAYILAN_GEMINI_PROMPT } from '../../utils/constants'

// ─── Bölüm: Personel ─────────────────────────────────────────────────────────
function PersonelBolumu() {
  const { data: personeller = [], isLoading } = usePersoneller()
  const { mutate: ekle, isPending: ekleniyor } = useAddPersonel()
  const { mutate: sil } = useDeletePersonel()
  const [yeniAd, setYeniAd] = useState('')

  const handleEkle = (e) => {
    e.preventDefault()
    const ad = yeniAd.trim()
    if (!ad) return
    ekle(ad, { onSuccess: () => setYeniAd('') })
  }

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        İş detaylarında "Görevli Personel" olarak atanabilecek kişiler.
      </p>
      <form onSubmit={handleEkle} className="flex gap-2 mb-4">
        <input
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
      {personeller.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Henüz kişi eklenmemiş</p>
      ) : (
        <ul className="space-y-1">
          {personeller.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors">
              <span className="text-sm text-gray-800 dark:text-gray-200">{p.ad}</span>
              <button onClick={() => sil(p.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all rounded">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-gray-400 text-right">{personeller.length} kişi</p>
    </div>
  )
}

// ─── Bölüm: İş Türleri ───────────────────────────────────────────────────────
function IsTurleriBolumu() {
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

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Bir iş birden fazla tür içerebilir. Aşama şablonları bu türlere göre otomatik oluşturulur.
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
        <p className="text-sm text-gray-400 text-center py-6">Henüz iş türü eklenmemiş</p>
      ) : (
        <ul className="space-y-1">
          {turler.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors">
              <span className="text-sm text-gray-800 dark:text-gray-200">{t.ad}</span>
              <button onClick={() => sil(t.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all rounded">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-gray-400 text-right">{turler.length} tür</p>
    </div>
  )
}

// ─── Bölüm: Aşama Şablonları ─────────────────────────────────────────────────
function AsamaSablonlariBolumu() {
  const { data: sablonlar = {} } = useAsamaSablonlari()
  const { mutateAsync: kaydet, isPending } = useSaveAsamaSablonu()
  const { data: isTurleri = [] } = useIsTurleri()
  const [secilenTur, setSecilenTur] = useState('')
  const [asamalar, setAsamalar] = useState([])
  const [degisti, setDegisti] = useState(false)

  const turAdlari = isTurleri.map((t) => t.ad)

  const handleTurSec = (tur) => {
    setSecilenTur(tur)
    const mevcutlar = sablonlar[tur]?.map((s) => s.asama_adi) || ASAMA_SABLONLARI[tur] || []
    setAsamalar([...mevcutlar])
    setDegisti(false)
  }

  const handleKaydet = async () => {
    await kaydet({ isTuru: secilenTur, asamaAdlari: asamalar })
    setDegisti(false)
  }

  const handleAsamaDegistir = (i, yeniDeger) => {
    const yeni = [...asamalar]
    yeni[i] = yeniDeger
    setAsamalar(yeni)
    setDegisti(true)
  }

  const handleEkle = () => {
    setAsamalar([...asamalar, ''])
    setDegisti(true)
  }

  const handleSil = (i) => {
    setAsamalar(asamalar.filter((_, idx) => idx !== i))
    setDegisti(true)
  }

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        İş türüne göre varsayılan aşama listesini düzenleyin.
      </p>
      <div className="flex gap-2 mb-4 flex-wrap">
        {[...new Set([...Object.keys(ASAMA_SABLONLARI), ...turAdlari])].map((tur) => (
          <button
            key={tur}
            onClick={() => handleTurSec(tur)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              secilenTur === tur
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 text-gray-600 dark:text-gray-400'
            }`}
          >
            {tur}
          </button>
        ))}
      </div>

      {secilenTur && (
        <div className="space-y-2">
          {asamalar.map((asama, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
              <input
                type="text"
                value={asama}
                onChange={(e) => handleAsamaDegistir(i, e.target.value)}
                className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button onClick={() => handleSil(i)} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleEkle}
              className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
            >
              <Plus size={14} /> Adım Ekle
            </button>
            <div className="flex-1" />
            {degisti && (
              <button
                onClick={handleKaydet}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Kaydet
              </button>
            )}
          </div>
        </div>
      )}

      {!secilenTur && (
        <p className="text-sm text-gray-400 text-center py-6">Düzenlemek için bir iş türü seçin</p>
      )}
    </div>
  )
}

// ─── Bölüm: Yapay Zeka ────────────────────────────────────────────────────────
function YapayZekaBolumu() {
  const { data: ayarlar = {} } = useAyarlar()
  const { mutate: setAyarlar, isPending } = useSetAyarlar()
  const [form, setForm] = useState({})
  const [degisti, setDegisti] = useState(false)

  useEffect(() => {
    if (Object.keys(ayarlar).length > 0 && Object.keys(form).length === 0) {
      setForm({
        gemini_api_keys: ayarlar.gemini_api_keys || '',
        gemini_model: ayarlar.gemini_model || 'gemini-1.5-pro',
        gemini_temperature: ayarlar.gemini_temperature || '0.2',
        gemini_prompt: ayarlar.gemini_prompt || VARSAYILAN_GEMINI_PROMPT,
      })
    }
  }, [ayarlar])

  const handleDegistir = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setDegisti(true)
  }

  const handleKaydet = () => {
    setAyarlar(form, { onSuccess: () => setDegisti(false) })
  }

  const MODELLER = [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro — Güçlü, yavaş' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash — Hızlı, hafif' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — Güncel, hızlı' },
    { value: 'gemini-2.0-pro-exp', label: 'Gemini 2.0 Pro Exp — Deneysel' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          API Anahtarları
        </label>
        <p className="text-xs text-gray-400 mt-0.5 mb-2">
          Birden fazla anahtar için virgülle ayırın. Sistem sırayla dener.
        </p>
        <textarea
          value={form.gemini_api_keys || ''}
          onChange={(e) => handleDegistir('gemini_api_keys', e.target.value)}
          rows={3}
          placeholder="AIza..., AIza..."
          className="w-full font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Model
        </label>
        <select
          value={form.gemini_model || 'gemini-1.5-pro'}
          onChange={(e) => handleDegistir('gemini_model', e.target.value)}
          className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MODELLER.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Temperature ({form.gemini_temperature || '0.2'})
        </label>
        <p className="text-xs text-gray-400 mt-0.5 mb-1">
          0.0 = çok deterministik, 1.0 = yaratıcı. Belge analizi için 0.1–0.3 önerilir.
        </p>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={form.gemini_temperature || 0.2}
          onChange={(e) => handleDegistir('gemini_temperature', e.target.value)}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Analiz Prompt'u
        </label>
        <p className="text-xs text-gray-400 mt-0.5 mb-2">
          <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{BELGE_METNI}'}</code> ile belge içeriği buraya yerleştirilir.
        </p>
        <textarea
          value={form.gemini_prompt || ''}
          onChange={(e) => handleDegistir('gemini_prompt', e.target.value)}
          rows={10}
          className="w-full font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
        <button
          onClick={() => handleDegistir('gemini_prompt', VARSAYILAN_GEMINI_PROMPT)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
        >
          Varsayılan prompt'a sıfırla
        </button>
      </div>

      {degisti && (
        <button
          onClick={handleKaydet}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Kaydet
        </button>
      )}
    </div>
  )
}

// ─── Bölüm: Entegrasyonlar ────────────────────────────────────────────────────
function EntegrasyonlarBolumu() {
  const { data: ayarlar = {} } = useAyarlar()
  const { mutate: setAyarlar, isPending } = useSetAyarlar()
  const [form, setForm] = useState({})
  const [degisti, setDegisti] = useState(false)

  useEffect(() => {
    if (Object.keys(ayarlar).length > 0 && Object.keys(form).length === 0) {
      setForm({
        paperless_url: ayarlar.paperless_url || '',
        paperless_token: ayarlar.paperless_token || '',
        tkgm_il_id: ayarlar.tkgm_il_id || '35',
        google_drive_root_folder_id: ayarlar.google_drive_root_folder_id || '',
      })
    }
  }, [ayarlar])

  const handleDegistir = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setDegisti(true)
  }

  const handleKaydet = () => {
    setAyarlar(form, { onSuccess: () => setDegisti(false) })
  }

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Paperless-ngx
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Paperless URL</label>
            <input
              type="text"
              value={form.paperless_url || ''}
              onChange={(e) => handleDegistir('paperless_url', e.target.value)}
              placeholder="http://paperless:8000"
              className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">API Token</label>
            <input
              type="password"
              value={form.paperless_token || ''}
              onChange={(e) => handleDegistir('paperless_token', e.target.value)}
              placeholder="Token..."
              className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          TKGM Parsel Sorgu
        </h4>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">
            İl ID (İzmir = 35)
          </label>
          <input
            type="text"
            value={form.tkgm_il_id || ''}
            onChange={(e) => handleDegistir('tkgm_il_id', e.target.value)}
            className="w-24 mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Google Drive
        </h4>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Kök Klasör ID</label>
          <input
            type="text"
            value={form.google_drive_root_folder_id || ''}
            onChange={(e) => handleDegistir('google_drive_root_folder_id', e.target.value)}
            placeholder="Drive klasör ID..."
            className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {degisti && (
        <button
          onClick={handleKaydet}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Kaydet
        </button>
      )}
    </div>
  )
}

// ─── Bölüm: Kurum Bilgileri ───────────────────────────────────────────────────
function KurumBilgileriBolumu() {
  const { data: ayarlar = {} } = useAyarlar()
  const { mutate: setAyarlar, isPending } = useSetAyarlar()
  const [form, setForm] = useState({})
  const [degisti, setDegisti] = useState(false)

  useEffect(() => {
    if (Object.keys(ayarlar).length > 0 && Object.keys(form).length === 0) {
      setForm({
        kurum_adi: ayarlar.kurum_adi || '',
        birim_adi: ayarlar.birim_adi || '',
        vade_uyari_gun: ayarlar.vade_uyari_gun || '7',
        is_no_hane: ayarlar.is_no_hane || '3',
        fuzzy_tolerans: ayarlar.fuzzy_tolerans || '2',
      })
    }
  }, [ayarlar])

  const handleDegistir = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setDegisti(true)
  }

  const handleKaydet = () => {
    setAyarlar(form, { onSuccess: () => setDegisti(false) })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Kurum Adı</label>
          <input
            type="text"
            value={form.kurum_adi || ''}
            onChange={(e) => handleDegistir('kurum_adi', e.target.value)}
            placeholder="İzmir Büyükşehir Belediyesi"
            className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Birim Adı</label>
          <input
            type="text"
            value={form.birim_adi || ''}
            onChange={(e) => handleDegistir('birim_adi', e.target.value)}
            placeholder="KUDEB"
            className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Vade Uyarı Süresi (gün)
          <span className="ml-1 text-gray-300 dark:text-gray-600">— Bu kadar gün kaldığında "yaklaşan" uyarısı verilir</span>
        </label>
        <input
          type="number"
          min="1"
          max="30"
          value={form.vade_uyari_gun || '7'}
          onChange={(e) => handleDegistir('vade_uyari_gun', e.target.value)}
          className="w-24 mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          İş No Hane Sayısı
          <span className="ml-1 text-gray-300 dark:text-gray-600">— Örn: 3 → 2026-001, 4 → 2026-0001</span>
        </label>
        <input
          type="number"
          min="2"
          max="6"
          value={form.is_no_hane || '3'}
          onChange={(e) => handleDegistir('is_no_hane', e.target.value)}
          className="w-24 mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Fuzzy Eşleştirme Toleransı (karakter)
          <span className="ml-1 text-gray-300 dark:text-gray-600">— Ada/parsel OCR hatası toleransı</span>
        </label>
        <input
          type="number"
          min="0"
          max="5"
          value={form.fuzzy_tolerans || '2'}
          onChange={(e) => handleDegistir('fuzzy_tolerans', e.target.value)}
          className="w-24 mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {degisti && (
        <button
          onClick={handleKaydet}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Kaydet
        </button>
      )}
    </div>
  )
}

// ─── Ana SettingsModal ────────────────────────────────────────────────────────
const BOLUMLER = [
  { id: 'personel', label: 'Görevli Kişiler', icon: Users },
  { id: 'is_turleri', label: 'İş Türleri', icon: Briefcase },
  { id: 'asamalar', label: 'Aşama Şablonları', icon: CheckSquare },
  { id: 'yapay_zeka', label: 'Yapay Zeka (Gemini)', icon: Cpu },
  { id: 'entegrasyonlar', label: 'Entegrasyonlar', icon: Key },
  { id: 'kurum', label: 'Kurum & Genel', icon: Info },
]

export default function SettingsModal({ onClose }) {
  const [aktifBolum, setAktifBolum] = useState('personel')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
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

        <div className="flex flex-1 min-h-0">
          {/* Sol nav */}
          <nav className="w-44 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 py-3 overflow-y-auto">
            {BOLUMLER.map((b) => {
              const Icon = b.icon
              return (
                <button
                  key={b.id}
                  onClick={() => setAktifBolum(b.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    aktifBolum === b.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium border-r-2 border-blue-500'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon size={15} />
                  {b.label}
                </button>
              )
            })}
          </nav>

          {/* Sağ içerik */}
          <div className="flex-1 overflow-y-auto p-5">
            {aktifBolum === 'personel' && <PersonelBolumu />}
            {aktifBolum === 'is_turleri' && <IsTurleriBolumu />}
            {aktifBolum === 'asamalar' && <AsamaSablonlariBolumu />}
            {aktifBolum === 'yapay_zeka' && <YapayZekaBolumu />}
            {aktifBolum === 'entegrasyonlar' && <EntegrasyonlarBolumu />}
            {aktifBolum === 'kurum' && <KurumBilgileriBolumu />}
          </div>
        </div>
      </div>
    </>
  )
}
