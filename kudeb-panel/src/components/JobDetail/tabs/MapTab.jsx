import { useState, useEffect } from 'react'
import { MapPin, ExternalLink, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useUpdateJob } from '../../../hooks/useJobs'
import { tkgmKoordinatBul } from '../../../api/pdf'
import LoadingSpinner from '../../common/LoadingSpinner'
import toast from 'react-hot-toast'

// Fix Leaflet default icon issue
function fixLeafletIcons(L) {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

// TKGM'den koordinat arama butonu
function TkgmButton({ job, onFound }) {
  const [durum, setDurum] = useState('idle') // idle | loading | found | error
  const [sonuc, setSonuc] = useState(null)
  const [hata, setHata] = useState('')

  const eksik = !job.ada || !job.parsel || !job.ilce_adi

  const handleAra = async () => {
    setDurum('loading')
    setSonuc(null)
    setHata('')
    try {
      const result = await tkgmKoordinatBul({
        ilce_adi: job.ilce_adi,
        mahalle_adi: job.mahalle_adi,
        ada: job.ada,
        parsel: job.parsel,
      })
      setSonuc(result)
      setDurum('found')
    } catch (err) {
      const mesaj =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'TKGM bağlantı hatası'
      setHata(mesaj)
      setDurum('error')
    }
  }

  const handleKaydet = () => {
    if (sonuc) {
      onFound(sonuc.lat, sonuc.lon)
      toast.success(`Koordinat kaydedildi: ${sonuc.lat.toFixed(5)}, ${sonuc.lon.toFixed(5)}`)
      setDurum('idle')
      setSonuc(null)
    }
  }

  return (
    <div className="w-full">
      {/* Arama butonu */}
      <button
        onClick={handleAra}
        disabled={eksik || durum === 'loading'}
        title={eksik ? 'Ada, parsel ve ilçe bilgisi gerekli' : 'TKGM\'den koordinat sorgula'}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
      >
        {durum === 'loading' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Search size={14} />
        )}
        {durum === 'loading' ? 'TKGM sorgulanıyor...' : 'Koordinat Bul (TKGM)'}
      </button>

      {eksik && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          İş kaydında ada, parsel ve ilçe bilgisi dolu olmalı
        </p>
      )}

      {/* Sonuç */}
      {durum === 'found' && sonuc && (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Parsel bulundu</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 truncate">{sonuc.adres}</p>
              <p className="text-xs font-mono text-green-700 dark:text-green-400 mt-0.5">
                {sonuc.lat.toFixed(6)}, {sonuc.lon.toFixed(6)}
              </p>
            </div>
          </div>
          <button
            onClick={handleKaydet}
            className="mt-2 w-full py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            Bu koordinatı kaydet
          </button>
        </div>
      )}

      {/* Hata */}
      {durum === 'error' && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Bulunamadı</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{hata}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CoordForm({ job, onSave }) {
  const [lat, setLat] = useState(job.koordinat_lat || '')
  const [lon, setLon] = useState(job.koordinat_lon || '')

  return (
    <div className="w-full max-w-sm">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Manuel koordinat gir:</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Enlem (Lat)</label>
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="38.4189"
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Boylam (Lon)</label>
          <input
            type="number"
            step="any"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            placeholder="26.9309"
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <button
        onClick={() => onSave(parseFloat(lat), parseFloat(lon))}
        disabled={!lat || !lon}
        className="mt-2 w-full py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md transition-colors"
      >
        Koordinatı Kaydet
      </button>
    </div>
  )
}

function LeafletMap({ lat, lon, job }) {
  const [mapComponents, setMapComponents] = useState(null)

  useEffect(() => {
    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default
      fixLeafletIcons(L)
      return import('react-leaflet').then((rl) => {
        setMapComponents({
          MapContainer: rl.MapContainer,
          TileLayer: rl.TileLayer,
          Marker: rl.Marker,
          Popup: rl.Popup,
        })
      })
    }).catch((e) => console.error('Leaflet load error:', e))
  }, [])

  if (!mapComponents) return <LoadingSpinner className="mt-12" />

  const { MapContainer, TileLayer, Marker, Popup } = mapComponents

  return (
    <MapContainer
      center={[lat, lon]}
      zoom={17}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lon]}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">{job.is_no}</p>
            <p className="text-gray-600">{job.ilce_adi} / {job.mahalle_adi}</p>
            {job.ada && <p className="text-gray-600">Ada: {job.ada}, Parsel: {job.parsel}</p>}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  )
}

export default function MapTab({ job }) {
  const { mutate: updateJob } = useUpdateJob()

  const lat = parseFloat(job.koordinat_lat)
  const lon = parseFloat(job.koordinat_lon)
  const hasCoords = !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0

  const handleSaveCoords = (newLat, newLon) => {
    updateJob({ id: job.id, data: { koordinat_lat: newLat, koordinat_lon: newLon } })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Actions bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <MapPin size={14} />
          {hasCoords ? (
            <span className="font-mono text-xs">{lat.toFixed(6)}, {lon.toFixed(6)}</span>
          ) : (
            <span className="text-gray-400">Koordinat bulunamadı</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasCoords && (
            <TkgmButton job={job} onFound={handleSaveCoords} />
          )}
          {job.osm_link && (
            <a
              href={job.osm_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <ExternalLink size={12} /> OSM
            </a>
          )}
        </div>
      </div>

      {/* Map or empty state */}
      {hasCoords ? (
        <div className="flex-1 relative">
          <LeafletMap lat={lat} lon={lon} job={job} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
          <div className="text-center">
            <MapPin size={40} className="text-gray-300 dark:text-gray-600 mb-4 mx-auto" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Bu iş için koordinat bilgisi bulunamadı
            </p>
          </div>

          {/* TKGM otomatik arama */}
          <div className="w-full max-w-sm p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-3 flex items-center gap-1.5">
              <Search size={14} /> TKGM'den Otomatik Bul
            </p>
            <p className="text-xs text-green-700 dark:text-green-400 mb-3">
              İlçe: <strong>{job.ilce_adi || '—'}</strong> &nbsp;|&nbsp;
              Mahalle: <strong>{job.mahalle_adi || '—'}</strong> &nbsp;|&nbsp;
              Ada: <strong>{job.ada || '—'}</strong> &nbsp;|&nbsp;
              Parsel: <strong>{job.parsel || '—'}</strong>
            </p>
            <TkgmButton job={job} onFound={handleSaveCoords} />
          </div>

          {/* Manuel giriş */}
          <div className="w-full max-w-sm p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Manuel Giriş</p>
            <CoordForm job={job} onSave={handleSaveCoords} />
          </div>
        </div>
      )}
    </div>
  )
}
