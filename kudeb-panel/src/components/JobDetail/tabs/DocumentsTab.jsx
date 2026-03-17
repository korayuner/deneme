import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FileText, Upload, ExternalLink, GripVertical, Loader2, Calendar, Tag } from 'lucide-react'
import { useDocuments, useUploadDocument } from '../../../hooks/useDocuments'
import { getDocumentThumb, getDocumentDownload, getPaperlessDocumentUrl } from '../../../api/paperless'
import { formatDate } from '../../../utils/date'
import LoadingSpinner from '../../common/LoadingSpinner'

function SortableDocument({ doc }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const isPdf = doc.mime_type === 'application/pdf' || doc.original_file_name?.endsWith('.pdf')
  const isImage = doc.mime_type?.startsWith('image/')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-300 transition-colors"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
      >
        <GripVertical size={16} />
      </button>

      {/* Thumbnail */}
      <div className="w-10 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
        {isPdf ? (
          <div className="w-full h-full flex items-center justify-center">
            <FileText size={20} className="text-red-400" />
          </div>
        ) : isImage ? (
          <img
            src={getDocumentThumb(doc.id)}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText size={20} className="text-gray-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={doc.title}>
          {doc.title || doc.original_file_name}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
          {doc.created && (
            <span className="flex items-center gap-1">
              <Calendar size={11} /> {formatDate(doc.created)}
            </span>
          )}
          {doc.tags?.length > 0 && (
            <span className="flex items-center gap-1">
              <Tag size={11} /> {doc.tags.length} etiket
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        <a
          href={getDocumentDownload(doc.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="İndir"
        >
          <ExternalLink size={14} />
        </a>
        <a
          href={getPaperlessDocumentUrl(doc.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          title="Paperless'ta aç"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  )
}

function DropZone({ job }) {
  const { mutate: uploadDoc, isPending } = useUploadDocument(job)

  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      uploadDoc({ file, metadata: { title: file.name } })
    })
  }, [uploadDoc])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png', '.tiff'] },
    disabled: isPending,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      } ${isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      {isPending ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload size={24} className="text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isDragActive ? 'Dosyayı bırakın' : 'PDF veya görsel sürükleyin'}
          </p>
          <p className="text-xs text-gray-400">veya tıklayın</p>
        </div>
      )}
    </div>
  )
}

export default function DocumentsTab({ job }) {
  const { data: docs = [], isLoading, isError } = useDocuments(job.ada, job.parsel)
  const [items, setItems] = useState(null)

  const displayDocs = items || docs

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = displayDocs.findIndex((d) => d.id === active.id)
      const newIndex = displayDocs.findIndex((d) => d.id === over.id)
      setItems(arrayMove(displayDocs, oldIndex, newIndex))
    }
  }

  if (!job.ada || !job.parsel) {
    return (
      <div className="p-8 text-center text-gray-400">
        <FileText size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Ada/parsel bilgisi olmadan belgeler listelenemez</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Upload zone */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <DropZone job={job} />
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {isLoading && <LoadingSpinner className="mt-6" />}
        {isError && <p className="text-sm text-red-500 text-center mt-4">Belgeler yüklenemedi</p>}

        {!isLoading && displayDocs.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <FileText size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Henüz belge yok</p>
          </div>
        )}

        {displayDocs.length > 0 && (
          <>
            <p className="text-xs text-gray-400 mb-3">{displayDocs.length} belge • Sıralamak için sürükleyin</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={displayDocs.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {displayDocs.map((doc) => (
                    <SortableDocument key={doc.id} doc={doc} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>
    </div>
  )
}
