import { useState, useEffect } from 'react'
import { MapPin, ExternalLink } from 'lucide-react'
import { useUpdateJob } from '../../../hooks/useJobs'
import LoadingSpinner from '../../common/LoadingSpinner'

// Fix Leaflet default icon issue
function fixLeafletIcons(L) {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

function CoordForm({ job, onSave }) {
  const [lat, setLat] = useState(job.koordinat_lat || '')
  const [lon, setLon] = useState(job.koordinat_lon || '')

  return (
    <div className="max-w-sm mx-auto mt-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Koordinat manuel olarak girin:</p>
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
        className="mt-3 w-full py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md transition-colors"
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

      {/* Map or empty state */}
      {hasCoords ? (
        <div className="flex-1 relative">
          <LeafletMap lat={lat} lon={lon} job={job} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <MapPin size={40} className="text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-2">
            Bu iş için koordinat bilgisi bulunamadı
          </p>
          <CoordForm job={job} onSave={handleSaveCoords} />
        </div>
      )}
    </div>
  )
}
