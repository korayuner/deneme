import { useState, useEffect, useRef } from 'react'
import { X, MapPin, List, ExternalLink, ChevronRight } from 'lucide-react'
import { useJobsForMap } from '../../hooks/useJobs'
import { useJob } from '../../hooks/useJobs'
import useStore from '../../store/useStore'
import { getVadeDurumu, formatDate } from '../../utils/date'
import LoadingSpinner from '../common/LoadingSpinner'

// Fix Leaflet default icon issue
function fixLeafletIcons(L) {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

// Color-coded circle markers by vade status
function getMarkerColor(vadeTarihi) {
  const durum = getVadeDurumu(vadeTarihi)
  if (durum === 'gecmis') return '#ef4444'   // red
  if (durum === 'yaklasan') return '#f97316' // orange
  return '#22c55e'                            // green
}

function createCircleIcon(L, color) {
  return L.divIcon({
    html: `<div style="
      width:14px;height:14px;
      background:${color};
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  })
}

// Mini panel showing selected job overview
function JobPreviewPanel({ jobId, onClose, onOpenDetail }) {
  const { data: job, isLoading } = useJob(jobId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner />
      </div>
    )
  }
  if (!job) return null

  const durum = getVadeDurumu(job.vade_tarihi)
  const durumColor = durum === 'gecmis' ? 'text-red-600' : durum === 'yaklasan' ? 'text-orange-500' : 'text-green-600'

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{job.is_no}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{job.ilce_adi} / {job.mahalle_adi}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
        >
          <X size={16} />
        </button>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-sm">
        {job.ada && (
          <div className="flex gap-2">
            <span className="text-gray-400 w-16 flex-shrink-0">Ada/Parsel</span>
            <span className="text-gray-700 dark:text-gray-300">{job.ada} / {job.parsel}</span>
          </div>
        )}
        {job.is_turu_adi && (
          <div className="flex gap-2">
            <span className="text-gray-400 w-16 flex-shrink-0">Tür</span>
            <span className="text-gray-700 dark:text-gray-300">{job.is_turu_adi}</span>
          </div>
        )}
        {job.gorevli_personel && (
          <div className="flex gap-2">
            <span className="text-gray-400 w-16 flex-shrink-0">Personel</span>
            <span className="text-gray-700 dark:text-gray-300">{job.gorevli_personel}</span>
          </div>
        )}
        {job.vade_tarihi && (
          <div className="flex gap-2">
            <span className="text-gray-400 w-16 flex-shrink-0">Vade</span>
            <span className={`font-medium ${durumColor}`}>{formatDate(job.vade_tarihi)}</span>
          </div>
        )}
        {job.son_durum && (
          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 line-clamp-3">
            {job.son_durum}
          </div>
        )}
      </div>

      {/* Open full detail button */}
      <button
        onClick={() => onOpenDetail(job.id)}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
      >
        Detay Panelinde Aç <ChevronRight size={16} />
      </button>
    </div>
  )
}

// Legend component
function MapLegend() {
  return (
    <div className="absolute bottom-6 left-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 text-xs border border-gray-200 dark:border-gray-600">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Vade Durumu</p>
      <div className="space-y-1.5">
        {[
          { color: '#22c55e', label: 'Zamanında' },
          { color: '#f97316', label: 'Yaklaşan (7 gün)' },
          { color: '#ef4444', label: 'Geçmiş' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div style={{ backgroundColor: color }} className="w-3 h-3 rounded-full border-2 border-white shadow-sm" />
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LeafletFullMap({ jobs, onMarkerClick }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default
      fixLeafletIcons(L)

      const map = L.map(mapRef.current, {
        center: [38.42, 27.13], // Default: İzmir Urla area
        zoom: 12,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map

      // Add markers
      const bounds = []
      jobs.forEach((job) => {
        const lat = parseFloat(job.koordinat_lat)
        const lon = parseFloat(job.koordinat_lon)
        if (isNaN(lat) || isNaN(lon)) return

        const color = getMarkerColor(job.vade_tarihi)
        const icon = createCircleIcon(L, color)
        const marker = L.marker([lat, lon], { icon })
          .addTo(map)
          .on('click', () => onMarkerClick(job.id))

        marker.bindTooltip(
          `<strong>${job.is_no}</strong><br>${job.ilce_adi || ''} ${job.mahalle_adi ? '/ ' + job.mahalle_adi : ''}`,
          { permanent: false, direction: 'top', offset: [0, -10] }
        )

        markersRef.current.push(marker)
        bounds.push([lat, lon])
      })

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markersRef.current = []
      }
    }
  }, []) // Run once on mount

  // Update markers when jobs change (without remounting map)
  useEffect(() => {
    if (!mapInstanceRef.current || !jobs.length) return

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default
      // Remove old markers
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      const bounds = []
      jobs.forEach((job) => {
        const lat = parseFloat(job.koordinat_lat)
        const lon = parseFloat(job.koordinat_lon)
        if (isNaN(lat) || isNaN(lon)) return

        const color = getMarkerColor(job.vade_tarihi)
        const icon = createCircleIcon(L, color)
        const marker = L.marker([lat, lon], { icon })
          .addTo(mapInstanceRef.current)
          .on('click', () => onMarkerClick(job.id))

        marker.bindTooltip(
          `<strong>${job.is_no}</strong><br>${job.ilce_adi || ''} ${job.mahalle_adi ? '/ ' + job.mahalle_adi : ''}`,
          { permanent: false, direction: 'top', offset: [0, -10] }
        )

        markersRef.current.push(marker)
        bounds.push([lat, lon])
      })

      if (bounds.length > 0 && mapInstanceRef.current.getZoom() < 10) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
      }
    })
  }, [jobs])

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
}

export default function FullMap() {
  const [selectedJobId, setSelectedJobId] = useState(null)
  const { setViewMode, setSelectedJobId: setGlobalSelectedJob, setActiveTab } = useStore()
  const { data: jobs = [], isLoading, error } = useJobsForMap()

  const handleMarkerClick = (jobId) => {
    setSelectedJobId(jobId)
  }

  const handleOpenDetail = (jobId) => {
    setGlobalSelectedJob(jobId)
    setActiveTab('ozet')
    setViewMode('list')
  }

  const handleClosePreview = () => {
    setSelectedJobId(null)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-3" />
          <p className="text-sm text-gray-500">Harita yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-red-500">
          <MapPin size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Harita verileri yüklenemedi</p>
          <p className="text-xs text-gray-400 mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  const jobsWithCoords = jobs.filter((j) => {
    const lat = parseFloat(j.koordinat_lat)
    const lon = parseFloat(j.koordinat_lon)
    return !isNaN(lat) && !isNaN(lon)
  })

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Map */}
      {jobsWithCoords.length === 0 ? (
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="text-center">
            <MapPin size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">Koordinat bilgisi olan iş bulunamadı</p>
            <p className="text-sm text-gray-400 mt-1">
              İş detayındaki Harita sekmesinden koordinat ekleyebilirsiniz.
            </p>
            <button
              onClick={() => setViewMode('list')}
              className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              <List size={16} /> Liste Görünümüne Dön
            </button>
          </div>
        </div>
      ) : (
        <LeafletFullMap jobs={jobsWithCoords} onMarkerClick={handleMarkerClick} />
      )}

      {/* Job count badge */}
      {jobsWithCoords.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-gray-800 rounded-full px-4 py-1.5 shadow-md text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
          <span className="font-semibold text-blue-600">{jobsWithCoords.length}</span> iş haritada gösteriliyor
        </div>
      )}

      {/* Legend */}
      <MapLegend />

      {/* Job preview panel */}
      {selectedJobId && (
        <div className="absolute top-3 right-3 z-[1000] w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 p-4">
          <JobPreviewPanel
            jobId={selectedJobId}
            onClose={handleClosePreview}
            onOpenDetail={handleOpenDetail}
          />
        </div>
      )}
    </div>
  )
}
