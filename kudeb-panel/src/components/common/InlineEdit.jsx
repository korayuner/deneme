import { useState, useRef, useEffect } from 'react'
import { Check, X, Pencil } from 'lucide-react'
import clsx from 'clsx'

export function InlineEditText({ value, onSave, placeholder = '-', className = '', multiline = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const ref = useRef(null)

  useEffect(() => {
    if (editing && ref.current) ref.current.focus()
  }, [editing])

  const handleSave = () => {
    onSave(draft)
    setEditing(false)
  }

  const handleCancel = () => {
    setDraft(value || '')
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') handleCancel()
  }

  if (editing) {
    const inputClass = clsx(
      'w-full rounded border border-blue-400 bg-white dark:bg-gray-800 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
      className,
    )
    return (
      <div className="flex items-start gap-1">
        {multiline ? (
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            className={inputClass}
          />
        ) : (
          <input
            ref={ref}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className={inputClass}
          />
        )}
        <button onClick={handleSave} className="mt-0.5 text-green-600 hover:text-green-700">
          <Check size={16} />
        </button>
        <button onClick={handleCancel} className="mt-0.5 text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={clsx(
        'group flex items-center gap-1 cursor-pointer rounded px-1 -mx-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
        className,
      )}
      title="Düzenlemek için tıklayın"
    >
      <span className={!value ? 'text-gray-400 italic text-sm' : ''}>
        {value || placeholder}
      </span>
      <Pencil size={12} className="opacity-0 group-hover:opacity-40 flex-shrink-0" />
    </span>
  )
}

export function InlineEditDate({ value, onSave, className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ? value.split('T')[0] : '')
  const ref = useRef(null)

  useEffect(() => {
    if (editing && ref.current) ref.current.focus()
  }, [editing])

  const handleSave = () => {
    onSave(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={ref}
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          className="rounded border border-blue-400 bg-white dark:bg-gray-800 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={handleSave} className="text-green-600 hover:text-green-700"><Check size={16} /></button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={clsx('group flex items-center gap-1 cursor-pointer rounded px-1 -mx-1 hover:bg-gray-100 dark:hover:bg-gray-700', className)}
      title="Düzenlemek için tıklayın"
    >
      <span className={!value ? 'text-gray-400 italic text-sm' : ''}>{value ? value.split('T')[0] : 'Tarih girilmedi'}</span>
      <Pencil size={12} className="opacity-0 group-hover:opacity-40 flex-shrink-0" />
    </span>
  )
}
