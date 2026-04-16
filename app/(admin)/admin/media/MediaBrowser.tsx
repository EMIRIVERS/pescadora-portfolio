'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FolderPlus,
  Upload,
  Trash2,
  Copy,
  ChevronRight,
  Home,
  X,
  Check,
  FolderOpen,
  Pencil,
} from 'lucide-react'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
const BUCKET = 'media'

interface FileItem {
  name: string
  id: string | null
  updated_at: string | null
  created_at: string | null
  metadata: { size?: number; mimetype?: string } | null
  isFolder: boolean
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getPublicUrl(path: string) {
  return `https://hncwnykfqeyghlpfygyw.supabase.co/storage/v1/object/public/media/${path}`
}

export default function MediaBrowser() {
  const supabase = createClient()
  const [path, setPath] = useState<string[]>([]) // current folder path segments
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [renamingItem, setRenamingItem] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentPrefix = path.length > 0 ? path.join('/') + '/' : ''

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: listError } = await supabase.storage
        .from(BUCKET)
        .list(currentPrefix, { limit: 200, sortBy: { column: 'name', order: 'asc' } })

      if (listError) { setError(listError.message); return }

      const mapped: FileItem[] = (data ?? []).map((item) => ({
        name: item.name,
        id: item.id ?? null,
        updated_at: item.updated_at ?? null,
        created_at: item.created_at ?? null,
        metadata: item.metadata as FileItem['metadata'],
        isFolder: item.id === null, // folders have no id in Supabase Storage
      }))

      // Sort: folders first, then files
      mapped.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1
        if (!a.isFolder && b.isFolder) return 1
        return a.name.localeCompare(b.name)
      })

      setItems(mapped)
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }, [currentPrefix, supabase.storage])

  useEffect(() => { void loadItems() }, [loadItems])

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)

    const results = await Promise.allSettled(
      Array.from(files).map(async (file) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filePath = currentPrefix + safeName
        setUploadProgress((p) => ({ ...p, [file.name]: 0 }))

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { upsert: true })

        if (uploadError) throw new Error(`${file.name}: ${uploadError.message}`)
        setUploadProgress((p) => ({ ...p, [file.name]: 100 }))
      })
    )

    const failures = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]
    if (failures.length > 0) {
      setError(failures.map((f) => (f.reason as Error).message).join(', '))
    }

    setUploading(false)
    setUploadProgress({})
    await loadItems()
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim().replace(/[^a-zA-Z0-9._-]/g, '_')
    if (!name) return
    // Supabase Storage creates "folders" by uploading a placeholder .keep file
    const folderPath = currentPrefix + name + '/.keep'
    const { error: err } = await supabase.storage
      .from(BUCKET)
      .upload(folderPath, new Blob(['']), { upsert: true })
    if (err) { setError(err.message); return }
    setNewFolderMode(false)
    setNewFolderName('')
    await loadItems()
  }

  async function handleDelete(names: string[]) {
    const paths = names.map((n) => {
      const item = items.find((i) => i.name === n)
      if (item?.isFolder) return currentPrefix + n + '/.keep'
      return currentPrefix + n
    })

    const { error: err } = await supabase.storage.from(BUCKET).remove(paths)
    if (err) { setError(err.message); return }
    setSelected(new Set())
    await loadItems()
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return
    if (!window.confirm(`Eliminar ${selected.size} elemento${selected.size > 1 ? 's' : ''}?`)) return
    await handleDelete([...selected])
  }

  function copyUrl(name: string) {
    const url = getPublicUrl(currentPrefix + name)
    void navigator.clipboard.writeText(url)
    setCopied(name)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleRename(oldName: string, newName: string) {
    if (!newName.trim() || newName === oldName) { setRenamingItem(null); return }
    const safeName = newName.trim().replace(/[^a-zA-Z0-9._-]/g, '_')

    const item = items.find((i) => i.name === oldName)
    if (item?.isFolder) {
      const oldPath = currentPrefix + oldName + '/.keep'
      const newPath = currentPrefix + safeName + '/.keep'
      const { data } = await supabase.storage.from(BUCKET).download(oldPath)
      if (data) {
        await supabase.storage.from(BUCKET).upload(newPath, data, { upsert: true })
        await supabase.storage.from(BUCKET).remove([oldPath])
      }
    } else {
      const oldPath = currentPrefix + oldName
      const newPath = currentPrefix + safeName
      await supabase.storage.from(BUCKET).copy(oldPath, newPath)
      await supabase.storage.from(BUCKET).remove([oldPath])
    }

    setRenamingItem(null)
    setRenameValue('')
    await loadItems()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    void handleUpload(e.dataTransfer.files)
  }

  const breadcrumbs = ['Inicio', ...path]

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: '#F5F5F7', letterSpacing: '-0.02em' }}>Media</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#86868B' }}>Archivos de imagen en Supabase Storage</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setNewFolderMode(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', backgroundColor: '#2C2C2E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 13, color: '#F5F5F7', cursor: 'pointer', fontFamily: FONT }}
          >
            <FolderPlus size={14} strokeWidth={1.5} /> Nueva carpeta
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#0071E3', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer', fontFamily: FONT }}
          >
            <Upload size={14} strokeWidth={2} /> Subir imágenes
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => void handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <ChevronRight size={12} strokeWidth={1.5} style={{ color: '#48484A' }} />}
            <button
              type="button"
              onClick={() => setPath(path.slice(0, i))}
              style={{
                border: 'none', background: 'transparent',
                color: i === breadcrumbs.length - 1 ? '#F5F5F7' : '#0071E3',
                fontFamily: FONT, fontSize: 13, cursor: 'pointer', padding: '2px 4px', borderRadius: 4,
                fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {i === 0 ? <><Home size={12} strokeWidth={1.5} /> Inicio</> : crumb}
            </button>
          </span>
        ))}
      </div>

      {/* New folder form */}
      {newFolderMode && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateFolder(); if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName('') } }}
            placeholder="Nombre de la carpeta"
            style={{ flex: 1, maxWidth: 280, backgroundColor: '#1C1C1E', border: '1px solid #0071E3', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#F5F5F7', fontFamily: FONT, outline: 'none' }}
          />
          <button type="button" onClick={() => void handleCreateFolder()} style={{ padding: '8px 12px', backgroundColor: '#0071E3', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
            <Check size={14} strokeWidth={2} />
          </button>
          <button type="button" onClick={() => { setNewFolderMode(false); setNewFolderName('') }} style={{ padding: '8px 12px', backgroundColor: '#2C2C2E', border: 'none', borderRadius: 8, color: '#86868B', cursor: 'pointer' }}>
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: 8, fontSize: 13, color: '#FF453A', fontFamily: FONT }}>
          {error}
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: '8px 12px', backgroundColor: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#86868B', fontFamily: FONT, marginRight: 4 }}>{selected.size} seleccionado{selected.size > 1 ? 's' : ''}</span>
          <button type="button" onClick={handleDeleteSelected} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: 'none', backgroundColor: 'rgba(255,69,58,0.1)', color: '#FF453A', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}>
            <Trash2 size={12} strokeWidth={1.5} /> Eliminar
          </button>
          <button type="button" onClick={() => setSelected(new Set())} style={{ padding: '5px 10px', border: 'none', backgroundColor: 'transparent', color: '#86868B', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}>
            Cancelar
          </button>
        </div>
      )}

      {/* Upload progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
          {Object.entries(uploadProgress).map(([name]) => (
            <p key={name} style={{ margin: '2px 0', fontSize: 12, color: '#86868B', fontFamily: FONT }}>Subiendo {name}...</p>
          ))}
        </div>
      )}

      {/* Drop zone + Grid */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          minHeight: 200,
          border: dragOver ? '2px dashed #0071E3' : '2px dashed transparent',
          borderRadius: 16,
          transition: 'border-color 0.15s',
          backgroundColor: dragOver ? 'rgba(0,113,227,0.04)' : 'transparent',
        }}
      >
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#48484A', fontSize: 14, fontFamily: FONT }}>Cargando...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16 }}>
            <Upload size={32} strokeWidth={1} style={{ color: '#3A3A3C', marginBottom: 16 }} />
            <p style={{ margin: 0, fontSize: 15, color: '#48484A', fontFamily: FONT }}>Sin archivos</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#3A3A3C', fontFamily: FONT }}>Arrastra imágenes aquí o usa el botón de subir</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {items.map((item) => {
              const isSelected = selected.has(item.name)
              const publicUrl = !item.isFolder ? getPublicUrl(currentPrefix + item.name) : null

              return (
                <div
                  key={item.name}
                  onClick={() => {
                    if (item.isFolder) {
                      setPath([...path, item.name])
                    } else {
                      setSelected((prev) => {
                        const next = new Set(prev)
                        next.has(item.name) ? next.delete(item.name) : next.add(item.name)
                        return next
                      })
                    }
                  }}
                  style={{
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: isSelected ? '2px solid #0071E3' : '2px solid transparent',
                    backgroundColor: '#1C1C1E',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'border-color 0.12s, box-shadow 0.12s',
                    boxShadow: isSelected ? '0 0 0 1px rgba(0,113,227,0.3)' : 'none',
                  }}
                >
                  {/* Thumbnail or folder icon */}
                  {item.isFolder ? (
                    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C2C2E' }}>
                      <FolderOpen size={40} strokeWidth={1} style={{ color: '#FF9F0A' }} />
                    </div>
                  ) : (
                    <div
                      style={{ height: 120, position: 'relative', backgroundColor: '#2C2C2E', overflow: 'hidden' }}
                      onClick={(e) => { e.stopPropagation(); setPreview(publicUrl!) }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={publicUrl!}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ padding: '8px 10px' }}>
                    {renamingItem === item.name ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleRename(item.name, renameValue)
                          if (e.key === 'Escape') setRenamingItem(null)
                        }}
                        onBlur={() => void handleRename(item.name, renameValue)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', boxSizing: 'border-box', margin: 0, fontSize: 12, fontWeight: 500, color: '#F5F5F7', fontFamily: FONT, backgroundColor: 'transparent', border: '1px solid #0071E3', borderRadius: 4, padding: '1px 4px', outline: 'none' }}
                      />
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: '#F5F5F7', fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>
                        {item.name === '.keep' ? '(carpeta vac\u00eda)' : item.name}
                      </p>
                    )}
                    {!item.isFolder && item.metadata?.size && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#48484A', fontFamily: FONT }}>{formatBytes(item.metadata.size)}</p>
                    )}
                  </div>

                  {/* Action buttons (visible on hover) */}
                  {item.name !== '.keep' && (
                    <div
                      className="media-item-actions"
                      style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => { setRenamingItem(item.name); setRenameValue(item.name) }}
                        title="Renombrar"
                        style={{ width: 26, height: 26, borderRadius: 6, border: 'none', backgroundColor: 'rgba(0,0,0,0.6)', color: '#F5F5F7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                      >
                        <Pencil size={12} strokeWidth={1.5} />
                      </button>
                      {!item.isFolder && (
                        <button
                          type="button"
                          onClick={() => copyUrl(item.name)}
                          title="Copiar URL"
                          style={{ width: 26, height: 26, borderRadius: 6, border: 'none', backgroundColor: 'rgba(0,0,0,0.6)', color: copied === item.name ? '#30D158' : '#F5F5F7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                        >
                          {copied === item.name ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.5} />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { if (window.confirm(`Eliminar "${item.name}"?`)) void handleDelete([item.name]) }}
                        title="Eliminar"
                        style={{ width: 26, height: 26, borderRadius: 6, border: 'none', backgroundColor: 'rgba(0,0,0,0.6)', color: '#FF453A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Drag hint */}
      {!dragOver && items.length > 0 && (
        <p style={{ marginTop: 12, fontSize: 12, color: '#3A3A3C', fontFamily: FONT, textAlign: 'center' }}>
          Arrastra imágenes aquí para subirlas
        </p>
      )}

      {/* Image preview modal */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <button
            type="button"
            onClick={() => setPreview(null)}
            style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', border: 'none', backgroundColor: 'rgba(255,255,255,0.1)', color: '#F5F5F7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="preview"
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12 }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); void navigator.clipboard.writeText(preview); setCopied('preview') }}
            style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', padding: '8px 20px', backgroundColor: '#1C1C1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: '#F5F5F7', cursor: 'pointer', fontSize: 13, fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {copied === 'preview' ? <><Check size={13} strokeWidth={2} /> URL copiada</> : <><Copy size={13} strokeWidth={1.5} /> Copiar URL</>}
          </button>
        </div>
      )}

      <style>{`
        .media-item-actions { opacity: 0; transition: opacity 0.15s; }
        div:hover > .media-item-actions { opacity: 1; }
      `}</style>
    </div>
  )
}
