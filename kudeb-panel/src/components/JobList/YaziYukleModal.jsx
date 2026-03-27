import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  X, Upload, FileText, Loader2, CheckCircle2, AlertCircle,
  MapPin, Building2, Plus, ArrowRight, Search,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { yaziAnalizEt, uploadAndAnalyze } from '../../api/pdf'
import { createJob } from '../../api/directus'
import useStore from '../../store/useStore'

// Step: 'yukle' | 'analiz' | 'sonuc' | 'kayit' | 'tamam'

export default function YaziYukleModal({ onClose }) {
  const [step, setStep] = useState('yukle')
  const [dosya, setDosya] = useState(null)
  const [sonuc, setSonuc] = useState(null)   // { analiz, eslesen_isler, next_is_no }
  const [hata, setHata] = useState('')
  const [seciliIs, setSeciliIs] = useState(null)   // matched job or null (= yeni iş)
  const [yeniIsNo, setYeniIsNo] = useState('')
  const [ilerleme, setIlerleme] = useState(0)
  const queryClient = useQueryClient()
  const { setSelectedJobId, setActiveTab } = useStore()

  // ── Dropzone ──
  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setDosya(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
  })

  // ── Analiz ──
  const handleAnalizEt = async () => {
    if (!dosya) return
    setHata('')
    setStep('analiz')
    try {
      const veri = await yaziAnalizEt(dosya, setIlerleme)
      setSonuc(veri)
      setYeniIsNo(veri.next_is_no)
      // Pre-select first match if ada+parsel match (strong match)
      if (veri.eslesen_isler?.length > 0 && veri.analiz?.ada && veri.analiz?.parsel) {
        setSeciliIs(veri.eslesen_isler[0])
      } else {
        setSeciliIs(null)  // yeni iş modu
      }
      setStep('sonuc')
    } catch (err) {
      setHata(err.response?.data?.error || err.message || 'Analiz başarısız.')
      setStep('yukle')
    }
  }

  // ── Kaydet ──
  const handleKaydet = async () => {
    setStep('kayit')
    setHata('')
    try {
      let is_no, is_id

      if (seciliIs) {
        // Mevcut işe ekle
        is_no = seciliIs.is_no
        is_id = seciliIs.id
      } else {
        // Yeni iş oluştur
        const analiz = sonuc.analiz
        const yeniIs = await createJob({
          is_no: yeniIsNo,
          ilce_adi: analiz.ilce || '',
          mahalle_adi: analiz.mahalle || '',
          ada: analiz.ada || '',
          parsel: analiz.parsel || '',
          son_durum: analiz.konu || '',
          kronolojik_ozet: analiz.ozet || '',
        })
        is_no = yeniIsNo
        is_id = yeniIs?.id
        // Yeni işi seç
        if (yeniIs?.id) {
          setSeciliIs({ ...yeniIs, is_no: yeniIsNo })
          queryClient.invalidateQueries({ queryKey: ['jobs'] })
          setSelectedJobId(yeniIs.id)
          setActiveTab('ozet')
        }
      }

      // Dosyayı Directus + Paperless'a yükle
      const ozet = seciliIs ? (seciliIs.son_durum || '') : ''
      await uploadAndAnalyze(dosya, is_no, is_id, ozet, null)

      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['belgeler', is_no] })
      setStep('tamam')
    } catch (err) {
      setHata(err.response?.data?.error || err.message || 'Kayıt başarısız.')
      setStep('sonuc')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Upload size={18} className="text-blue-500" />
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">Yazı Yükle</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* ── STEP: yukle ── */}
            {(step === 'yukle') && (
              <>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <input {...getInputProps()} />
                  <FileText size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  {dosya ? (
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-200">{dosya.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{(dosya.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">PDF veya Word dosyasını buraya sürükleyin</p>
                      <p className="text-xs text-gray-400 mt-1">veya tıklayarak seçin · Maks 50 MB</p>
                    </div>
                  )}
                </div>
                {hata && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    {hata}
                  </div>
                )}
              </>
            )}

            {/* ── STEP: analiz ── */}
            {step === 'analiz' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 size={36} className="animate-spin text-blue-500" />
                <div className="text-center">
                  <p className="font-medium text-gray-700 dark:text-gray-200">Yazı analiz ediliyor...</p>
                  <p className="text-xs text-gray-400 mt-1">Gemini yapay zekâ yazıyı okuyor</p>
                </div>
                {ilerleme > 0 && ilerleme < 100 && (
                  <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${ilerleme}%` }} />
                  </div>
                )}
              </div>
            )}

            {/* ── STEP: kayit ── */}
            {step === 'kayit' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 size={36} className="animate-spin text-blue-500" />
                <p className="font-medium text-gray-700 dark:text-gray-200">Kaydediliyor...</p>
              </div>
            )}

            {/* ── STEP: tamam ── */}
            {step === 'tamam' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <CheckCircle2 size={48} className="text-green-500" />
                <div className="text-center">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">Başarıyla kaydedildi!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {seciliIs ? `"${seciliIs.is_no}" numaralı işe eklendi.` : `"${yeniIsNo}" numaralı yeni iş oluşturuldu.`}
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP: sonuc ── */}
            {step === 'sonuc' && sonuc && (
              <>
                {/* Analiz özeti */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Belge Analizi</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {sonuc.analiz.konu && (
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">Konu: </span>
                        <span className="text-gray-800 dark:text-gray-200">{sonuc.analiz.konu}</span>
                      </div>
                    )}
                    {sonuc.analiz.kimden && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Kimden: </span>
                        <span className="text-gray-800 dark:text-gray-200">{sonuc.analiz.kimden}</span>
                      </div>
                    )}
                    {sonuc.analiz.tarih && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Tarih: </span>
                        <span className="text-gray-800 dark:text-gray-200">{sonuc.analiz.tarih}</span>
                      </div>
                    )}
                    {(sonuc.analiz.ilce || sonuc.analiz.mahalle) && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Konum: </span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {[sonuc.analiz.ilce, sonuc.analiz.mahalle].filter(Boolean).join(' / ')}
                        </span>
                      </div>
                    )}
                    {(sonuc.analiz.ada || sonuc.analiz.parsel) && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Ada/Parsel: </span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {[sonuc.analiz.ada, sonuc.analiz.parsel].filter(Boolean).join(' / ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Eşleşen işler */}
                {sonuc.eslesen_isler?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Eşleşen İşler ({sonuc.eslesen_isler.length})
                    </h3>
                    <ul className="space-y-2">
                      {sonuc.eslesen_isler.map((is) => (
                        <li key={is.id}>
                          <button
                            onClick={() => setSeciliIs(is)}
                            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                              seciliIs?.id === is.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-semibold text-sm text-gray-800 dark:text-gray-200">
                                {is.is_no}
                              </span>
                              {seciliIs?.id === is.id && (
                                <CheckCircle2 size={16} className="text-blue-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Building2 size={11} />
                                {[is.ilce_adi, is.mahalle_adi].filter(Boolean).join(' / ')}
                              </span>
                              {(is.ada || is.parsel) && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={11} />
                                  Ada {is.ada} / Parsel {is.parsel}
                                </span>
                              )}
                            </div>
                            {is.son_durum && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{is.son_durum}</p>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Yeni iş seçeneği */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    {sonuc.eslesen_isler?.length > 0 ? 'Veya Yeni İş Oluştur' : 'Yeni İş Olarak Kaydet'}
                  </h3>
                  <button
                    onClick={() => setSeciliIs(null)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                      seciliIs === null
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Plus size={15} className="text-green-600" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Yeni iş oluştur</span>
                      </div>
                      {seciliIs === null && <CheckCircle2 size={16} className="text-green-500" />}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-400">İş No:</span>
                      <input
                        type="text"
                        value={yeniIsNo}
                        onChange={(e) => { setYeniIsNo(e.target.value); setSeciliIs(null) }}
                        onClick={(e) => { e.stopPropagation(); setSeciliIs(null) }}
                        className="font-mono text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500 w-32"
                      />
                    </div>
                  </button>
                </div>

                {hata && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    {hata}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            {step === 'tamam' ? (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                Kapat
              </button>
            ) : step === 'sonuc' ? (
              <>
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  İptal
                </button>
                <button
                  onClick={handleKaydet}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  <ArrowRight size={15} />
                  {seciliIs ? `"${seciliIs.is_no}" İşine Ekle` : 'Yeni İş Oluştur ve Ekle'}
                </button>
              </>
            ) : step === 'yukle' ? (
              <>
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  İptal
                </button>
                <button
                  onClick={handleAnalizEt}
                  disabled={!dosya}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                >
                  <Search size={15} />
                  Analiz Et
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
