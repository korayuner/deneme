import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFotograflar, fotografYukle, fotografSil } from '../../../api/drive'
import {
  Image, Upload, X, ZoomIn, Loader2, FolderOpen,
  ExternalLink, ChevronDown, ChevronRight, Trash2, Calendar,
} from 'lucide-react'
import LoadingSpinner from '../../common/LoadingSpinner'
import toast from 'react-hot-toast'

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useFotograflar(is_no) {
  return useQuery({
    queryKey: ['fotograflar', is_no],
    queryFn: () => getFotograflar(is_no),
    enabled: !!is_no,
  })
}

function useFotografYukle(job) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ files, tarih, aciklama }) =>
      fotografYukle(
        files, job.is_no,
        { ilce: job.ilce_adi, mahalle: job.mahalle_adi, ada: job.ada, parsel: job.parsel },
        tarih, aciklama,
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['fotograflar', job.is_no] })
      toast.success(`${data.yuklenen_sayisi} fotoğraf Google Drive'a yüklendi`)
    },
    onError: (err) => toast.error('Yükleme hatası: ' + (err.response?.data?.error || err.message)),
  })
}

function useFotografSil(is_no) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fotografSil,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fotograflar', is_no] })
      toast.success('Fotoğraf silindi')
    },
  })
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ foto, onKapat }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
      onClick={onKapat}
    >
      <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <button onClick={onKapat} className="absolute -top-9 right-0 text-white/70 hover:text-white">
          <X size={24} />
        </button>
        <img
          src={`https://drive.google.com/thumbnail?id=${foto.drive_file_id}&sz=w1600`}
          alt={foto.dosya_adi}
          className="max-w-full max-h-[82vh] object-contain rounded-lg shadow-2xl"
        />
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-white/70 text-sm truncate max-w-xs">{foto.dosya_adi}</p>
          <a
            href={foto.web_view_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 hover:text-white flex items-center gap-1 text-xs flex-shrink-0 ml-4"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} /> Drive'da aç
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Yükleme Formu ─────────────────────────────────────────────────────────────

function YuklemeFormu({ job, onKapat }) {
  const [tarih, setTarih]       = useState(new Date().toISOString().split('T')[0])
  const [aciklama, setAciklama] = useState('')
  const [dosyalar, setDosyalar] = useState([])

  const { mutate: yukle, isPending } = useFotografYukle(job)

  const onDrop = useCallback((files) => setDosyalar((prev) => [...prev, ...files]), [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.tiff'] },
    multiple: true,
    disabled: isPending,
  })

  const kaldir = (idx) => setDosyalar((prev) => prev.filter((_, i) => i !== idx))

  const handleYukle = () => {
    if (!dosyalar.length) return
    yukle({ files: dosyalar, tarih, aciklama: aciklama || 'İnceleme' }, { onSuccess: onKapat })
  }

  return (
    <div className="border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Fotoğraf Yükle → Google Drive</span>
        <button onClick={onKapat} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>

      {/* Tarih + Klasör adı */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">İnceleme Tarihi</label>
          <input
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-200"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Klasör Adı</label>
          <input
            type="text"
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Saha İncelemesi"
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-200"
          />
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-100 dark:bg-blue-900/40'
            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={20} className="mx-auto mb-1.5 text-gray-400" />
        <p className="text-xs text-gray-500">
          {isDragActive ? 'Bırakın...' : 'Fotoğrafları sürükleyin veya tıklayın'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">JPG · PNG · WEBP · HEIC · çoklu seçim</p>
      </div>

      {/* Seçili dosyalar */}
      {dosyalar.length > 0 && (
        <div className="space-y-1 max-h-28 overflow-y-auto scrollbar-thin">
          {dosyalar.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 rounded px-2 py-1">
              <span className="truncate text-gray-700 dark:text-gray-300">{f.name}</span>
              <button onClick={() => kaldir(i)} className="text-gray-300 hover:text-red-400 ml-2 flex-shrink-0">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleYukle}
        disabled={!dosyalar.length || isPending}
        className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2"
      >
        {isPending
          ? <><Loader2 size={15} className="animate-spin" /> Drive'a yükleniyor...</>
          : <><Upload size={15} /> {dosyalar.length} fotoğraf yükle</>
        }
      </button>
    </div>
  )
}

// ─── İnceleme Grubu ────────────────────────────────────────────────────────────

function IncelemeGrubu({ grup, is_no, onFotoClick }) {
  const [acik, setAcik]         = useState(true)
  const { mutate: sil }         = useFotografSil(is_no)

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Başlık satırı */}
      <button
        onClick={() => setAcik((a) => !a)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
      >
        {acik
          ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
          : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
        }
        <FolderOpen size={14} className="text-yellow-500 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">
          {grup.aciklama || 'İnceleme'}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
          <Calendar size={11} /> {grup.tarih}
        </span>
        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
          {grup.fotograflar.length} fotoğraf
        </span>
      </button>

      {/* Fotoğraf ızgarası */}
      {acik && (
        <div className="p-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {grup.fotograflar.map((foto) => (
            <div
              key={foto.id}
              className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
            >
              <img
                src={
                  foto.thumbnail_link ||
                  `https://drive.google.com/thumbnail?id=${foto.drive_file_id}&sz=w400`
                }
                alt={foto.dosya_adi}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2">
                <button
                  onClick={() => onFotoClick(foto)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/40 transition-opacity"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => sil(foto.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-white/20 text-white hover:bg-red-500/80 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function PhotosTab({ job }) {
  const [formAcik, setFormAcik]   = useState(false)
  const [seciliFoto, setSeciliFoto] = useState(null)

  const { data: gruplar = [], isLoading, isError } = useFotograflar(job.is_no)

  const toplamFoto = gruplar.reduce((t, g) => t + g.fotograflar.length, 0)

  if (!job.is_no) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Image size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">İş numarası olmadan fotoğraflar listelenemez</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Araç çubuğu */}
      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-gray-400">
          {toplamFoto > 0
            ? `${toplamFoto} fotoğraf · ${gruplar.length} inceleme`
            : 'Henüz fotoğraf yok'}
        </span>
        <button
          onClick={() => setFormAcik((a) => !a)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          <Upload size={13} /> Fotoğraf Yükle
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {/* Yükleme formu */}
        {formAcik && <YuklemeFormu job={job} onKapat={() => setFormAcik(false)} />}

        {isLoading && <LoadingSpinner className="mt-8" />}

        {isError && (
          <p className="text-sm text-red-500 text-center mt-4">Fotoğraflar yüklenemedi</p>
        )}

        {/* Boş durum */}
        {!isLoading && !isError && gruplar.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <Image size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Henüz fotoğraf yok</p>
            <p className="text-xs mt-1.5 text-gray-300 leading-relaxed">
              Yüklenen fotoğraflar Google Drive'da<br />
              <span className="font-mono text-gray-400">{job.is_no} / Fotoğraflar</span><br />
              klasörüne otomatik kaydedilir
            </p>
          </div>
        )}

        {/* İnceleme grupları */}
        {gruplar.map((grup, i) => (
          <IncelemeGrubu
            key={i}
            grup={grup}
            is_no={job.is_no}
            onFotoClick={setSeciliFoto}
          />
        ))}
      </div>

      {seciliFoto && <Lightbox foto={seciliFoto} onKapat={() => setSeciliFoto(null)} />}
    </div>
  )
}
