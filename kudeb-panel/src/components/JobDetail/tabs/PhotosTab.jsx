import { useState } from 'react'
import { Image, X, ZoomIn } from 'lucide-react'
import { useDocuments } from '../../../hooks/useDocuments'
import { getDocumentThumb, getDocumentPreview, getPaperlessDocumentUrl } from '../../../api/paperless'
import LoadingSpinner from '../../common/LoadingSpinner'

function Lightbox({ doc, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-8 right-0 text-white/70 hover:text-white"
        >
          <X size={24} />
        </button>
        <img
          src={getDocumentPreview(doc.id)}
          alt={doc.title}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
        <p className="text-white/70 text-sm text-center mt-2">{doc.title || doc.original_file_name}</p>
      </div>
    </div>
  )
}

export default function PhotosTab({ job }) {
  const { data: allDocs = [], isLoading } = useDocuments(job.ada, job.parsel)
  const [selected, setSelected] = useState(null)

  // Filter to image documents only
  const photos = allDocs.filter((doc) =>
    doc.mime_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|tiff|bmp)$/i.test(doc.original_file_name || ''),
  )

  if (!job.ada || !job.parsel) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Image size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Ada/parsel bilgisi olmadan fotoğraflar listelenemez</p>
      </div>
    )
  }

  if (isLoading) return <LoadingSpinner className="mt-12" />

  if (photos.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Image size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Fotoğraf bulunamadı</p>
        <p className="text-xs mt-1 text-gray-300">Belgeler sekmesinden görsel yükleyebilirsiniz</p>
      </div>
    )
  }

  return (
    <div className="p-4 overflow-y-auto scrollbar-thin h-full">
      <p className="text-xs text-gray-400 mb-4">{photos.length} fotoğraf</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer"
            onClick={() => setSelected(photo)}
          >
            <img
              src={getDocumentThumb(photo.id)}
              alt={photo.title || photo.original_file_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform">
              <p className="text-white text-xs truncate">{photo.title || photo.original_file_name}</p>
            </div>
          </div>
        ))}
      </div>

      {selected && <Lightbox doc={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
