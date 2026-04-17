'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, Trash2, Eye, EyeOff, X, Check, ChevronDown, ChevronRight, Upload,
} from 'lucide-react'
import {
  createAlbum,
  updateAlbum,
  deleteAlbum,
  reorderAlbums,
  addPhoto,
  deletePhoto,
  reorderPhotos,
} from '@/lib/actions/photos'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
const BUCKET = 'media'

function getPublicUrl(storagePath: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
}

export interface Photo {
  id: string
  album_id: string
  storage_path: string
  alt_text: string
  sort_order: number
}

export interface Album {
  id: string
  slug: string
  label: string
  sort_order: number
  is_visible: boolean
  portfolio_photos: Photo[]
}

// ─── Sortable photo cell ──────────────────────────────────────────────────────

function SortablePhoto({
  photo,
  onDelete,
  deletingId,
}: {
  photo: Photo
  onDelete: (photo: Photo) => void
  deletingId: string | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  })

  return (
    <div
      ref={setNodeRef}
      className="pm-photo-cell"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging || deletingId === photo.id ? 0.4 : 1,
        position: 'relative',
        aspectRatio: '1',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--dash-surface-3)',
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        flexShrink: 0,
      }}
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getPublicUrl(photo.storage_path)}
        alt={photo.alt_text}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
      />
      <button
        className="pm-delete-btn"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete(photo) }}
        disabled={deletingId === photo.id}
        title="Eliminar foto"
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.72)',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: 0,
          transition: 'opacity 0.15s',
          zIndex: 2,
          padding: 0,
        }}
      >
        <X size={10} strokeWidth={2.5} />
      </button>
    </div>
  )
}

// ─── Photo grid for one album ─────────────────────────────────────────────────

function PhotoGrid({
  album,
  onPhotosChange,
}: {
  album: Album
  onPhotosChange: (albumId: string, photos: Photo[]) => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<Photo[]>(
    [...album.portfolio_photos].sort((a, b) => a.sort_order - b.sort_order),
  )
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadTotal, setUploadTotal] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dropOver, setDropOver] = useState(false)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ── Upload ─────────────────────────────────────────────────────────────────

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!arr.length) return
    setUploading(true)
    setUploadProgress(0)
    setUploadTotal(arr.length)

    let nextOrder = photos.length > 0 ? Math.max(...photos.map((p) => p.sort_order)) + 1 : 0

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i]
      const ext = file.name.split('.').pop() ?? 'jpg'
      const storagePath = `fotografia/${album.slug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false })

      if (uploadError) {
        console.error('Upload error:', uploadError.message)
        setUploadProgress(i + 1)
        continue
      }

      const altText = file.name.replace(/\.[^/.]+$/, '')
      try {
        await addPhoto(album.id, storagePath, altText, nextOrder)
        const newPhoto: Photo = {
          id: `temp-${Date.now()}-${i}`,
          album_id: album.id,
          storage_path: storagePath,
          alt_text: altText,
          sort_order: nextOrder,
        }
        setPhotos((prev) => {
          const updated = [...prev, newPhoto]
          onPhotosChange(album.id, updated)
          return updated
        })
        nextOrder++
      } catch (err) {
        console.error('DB error:', err)
      }

      setUploadProgress(i + 1)
    }

    setUploading(false)
    router.refresh()
  }

  // ── Drag-and-drop reorder ─────────────────────────────────────────────────

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = photos.findIndex((p) => p.id === active.id)
    const newIdx = photos.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(photos, oldIdx, newIdx).map((p, i) => ({
      ...p,
      sort_order: i,
    }))
    setPhotos(reordered)
    onPhotosChange(album.id, reordered)
    startTransition(async () => {
      await reorderPhotos(reordered.map((p) => ({ id: p.id, sort_order: p.sort_order })))
    })
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(photo: Photo) {
    if (!window.confirm('Eliminar esta foto?')) return
    setDeletingId(photo.id)
    try {
      await deletePhoto(photo.id, photo.storage_path)
      setPhotos((prev) => {
        const updated = prev.filter((p) => p.id !== photo.id)
        onPhotosChange(album.id, updated)
        return updated
      })
    } finally {
      setDeletingId(null)
    }
  }

  // ── File drop (OS files, not dnd-kit) ────────────────────────────────────

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDropOver(false)
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files)
    }
  }

  return (
    <div style={{ padding: '12px 16px 16px', background: '#111', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: 6,
            }}
          >
            {photos.map((photo) => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            ))}

            {/* Upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDropOver(true) }}
              onDragLeave={() => setDropOver(false)}
              onDrop={handleFileDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                border: `1.5px dashed ${dropOver ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
                background: dropOver ? 'rgba(255,255,255,0.05)' : 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                cursor: uploading ? 'wait' : 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                flexShrink: 0,
              }}
            >
              {uploading ? (
                <span style={{ fontSize: 10, color: 'var(--dash-text-tertiary)', fontFamily: FONT, textAlign: 'center', padding: '0 4px' }}>
                  {uploadProgress}/{uploadTotal}
                </span>
              ) : (
                <>
                  <Upload size={14} strokeWidth={1.5} color="var(--dash-text-tertiary)" />
                  <span style={{ fontSize: 9, color: 'var(--dash-text-tertiary)', fontFamily: FONT, textAlign: 'center', lineHeight: 1.3 }}>
                    Subir<br />fotos
                  </span>
                </>
              )}
            </div>
          </div>
        </SortableContext>
      </DndContext>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = '' }}
      />

      {photos.length === 0 && !uploading && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>
          Arrastra fotos aqui o haz clic en el cuadro para subir.
        </p>
      )}
    </div>
  )
}

// ─── Main PhotoManager ────────────────────────────────────────────────────────

export default function PhotoManager({ initialAlbums }: { initialAlbums: Album[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [albums, setAlbums] = useState<Album[]>(
    [...initialAlbums].sort((a, b) => a.sort_order - b.sort_order),
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sorted = [...albums].sort((a, b) => a.sort_order - b.sort_order)

  // ── Create ────────────────────────────────────────────────────────────────

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newLabel.trim()) return
    setError(null)
    const fd = new FormData()
    fd.set('label', newLabel.trim())
    startTransition(async () => {
      try {
        await createAlbum(fd)
        setShowNew(false)
        setNewLabel('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al crear')
      }
    })
  }

  // ── Rename ────────────────────────────────────────────────────────────────

  function handleSaveEdit(album: Album) {
    const trimmed = editLabel.trim()
    if (!trimmed) return
    startTransition(async () => {
      try {
        await updateAlbum(album.id, { label: trimmed })
        setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, label: trimmed } : a))
        setEditingId(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
  }

  // ── Visibility ────────────────────────────────────────────────────────────

  function handleToggle(album: Album) {
    const next = !album.is_visible
    setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, is_visible: next } : a))
    startTransition(async () => {
      try {
        await updateAlbum(album.id, { is_visible: next })
      } catch {
        setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, is_visible: album.is_visible } : a))
      }
    })
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(album: Album) {
    if (!window.confirm(`Eliminar el album "${album.label}" y todas sus fotos?`)) return
    startTransition(async () => {
      try {
        await deleteAlbum(album.id)
        setAlbums((prev) => prev.filter((a) => a.id !== album.id))
        if (expandedId === album.id) setExpandedId(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar')
      }
    })
  }

  // ── Reorder ───────────────────────────────────────────────────────────────

  function handleReorder(album: Album, dir: 'up' | 'down') {
    const idx = sorted.findIndex((a) => a.id === album.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const adj = sorted[swapIdx]
    const snapshot = albums
    setAlbums((prev) =>
      prev.map((a) => {
        if (a.id === album.id) return { ...a, sort_order: adj.sort_order }
        if (a.id === adj.id) return { ...a, sort_order: album.sort_order }
        return a
      }),
    )
    setReorderingId(album.id)
    startTransition(async () => {
      try {
        await reorderAlbums(album.id, adj.id, album.sort_order, adj.sort_order)
      } catch {
        setAlbums(snapshot)
      } finally {
        setReorderingId(null)
      }
    })
  }

  // ── Photo change callback ─────────────────────────────────────────────────

  function handlePhotosChange(albumId: string, photos: Photo[]) {
    setAlbums((prev) =>
      prev.map((a) => a.id === albumId ? { ...a, portfolio_photos: photos } : a),
    )
  }

  const INPUT: React.CSSProperties = {
    backgroundColor: 'var(--dash-surface-2)',
    border: '1px solid var(--dash-border)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 14,
    color: 'var(--dash-text-primary)',
    fontFamily: FONT,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`
        .pm-row { transition: background 0.12s; }
        .pm-row:hover { background: rgba(255,255,255,0.03) !important; }
        .pm-btn { transition: background 0.12s, color 0.12s; }
        .pm-btn:hover { background: var(--dash-surface-3) !important; color: var(--dash-text-primary) !important; }
        .pm-del:hover { background: rgba(255,69,58,0.15) !important; color: #FF453A !important; }
        .pm-photo-cell:hover .pm-delete-btn { opacity: 1 !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dash-text-secondary)' }}>
            Albums de fotografias
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--dash-text-tertiary)' }}>
            Crea albums, sube fotos con drag & drop o seleccionandolas, reordena arrastrando
          </p>
        </div>
        <button
          onClick={() => { setShowNew(true); setError(null) }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', borderRadius: 8, fontSize: 13, color: 'var(--dash-text-primary)', cursor: 'pointer', fontFamily: FONT }}
        >
          <Plus size={13} strokeWidth={2} />
          Nuevo album
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: '#FF453A', marginBottom: 12 }}>{error}</p>}

      {/* New album form */}
      {showNew && (
        <form
          onSubmit={handleCreate}
          style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: 12, background: 'var(--dash-surface-2)', borderRadius: 10, border: '1px solid var(--dash-border)' }}
        >
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nombre del album (ej. Retratos)"
            required
            autoFocus
            style={{ ...INPUT, flex: 1 }}
          />
          <button
            type="submit"
            disabled={isPending || !newLabel.trim()}
            style={{ padding: '8px 16px', background: '#0071E3', border: 'none', borderRadius: 8, fontSize: 13, color: '#fff', cursor: 'pointer', opacity: isPending ? 0.5 : 1, fontFamily: FONT }}
          >
            {isPending ? '...' : 'Crear'}
          </button>
          <button
            type="button"
            onClick={() => { setShowNew(false); setNewLabel('') }}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'transparent', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', borderRadius: 6 }}
          >
            <X size={14} />
          </button>
        </form>
      )}

      {/* Album list */}
      <div style={{ background: 'var(--dash-surface-1)', border: '1px solid var(--dash-border)', borderRadius: 12, overflow: 'hidden' }}>
        {sorted.map((album, idx) => (
          <div key={album.id}>
            {/* Album row */}
            <div
              className="pm-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                borderBottom: idx < sorted.length - 1 && expandedId !== album.id
                  ? '1px solid var(--dash-surface-2)'
                  : undefined,
                opacity: album.is_visible ? 1 : 0.45,
              }}
            >
              {/* Up/Down */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  className="pm-btn"
                  onClick={() => handleReorder(album, 'up')}
                  disabled={idx === 0 || isPending || reorderingId === album.id}
                  style={{ width: 20, height: 20, background: 'transparent', border: 'none', color: idx === 0 ? 'var(--dash-surface-3)' : 'var(--dash-text-tertiary)', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 9, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >▲</button>
                <button
                  className="pm-btn"
                  onClick={() => handleReorder(album, 'down')}
                  disabled={idx === sorted.length - 1 || isPending || reorderingId === album.id}
                  style={{ width: 20, height: 20, background: 'transparent', border: 'none', color: idx === sorted.length - 1 ? 'var(--dash-surface-3)' : 'var(--dash-text-tertiary)', cursor: idx === sorted.length - 1 ? 'not-allowed' : 'pointer', fontSize: 9, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >▼</button>
              </div>

              {/* Expand toggle */}
              <button
                onClick={() => setExpandedId(expandedId === album.id ? null : album.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'transparent', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', borderRadius: 4, flexShrink: 0 }}
              >
                {expandedId === album.id
                  ? <ChevronDown size={13} strokeWidth={2} />
                  : <ChevronRight size={13} strokeWidth={2} />}
              </button>

              {/* Label / edit */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === album.id ? (
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(album)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    style={{ ...INPUT, padding: '5px 10px', fontSize: 13, width: '100%' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{ fontSize: 14, fontWeight: 600, color: 'var(--dash-text-primary)', cursor: 'pointer' }}
                      onClick={() => setExpandedId(expandedId === album.id ? null : album.id)}
                    >
                      {album.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--dash-text-secondary)', backgroundColor: 'var(--dash-border)', borderRadius: 20, padding: '1px 8px', lineHeight: '18px', flexShrink: 0 }}>
                      {album.portfolio_photos.length} foto{album.portfolio_photos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {editingId === album.id ? (
                  <>
                    <button className="pm-btn" onClick={() => handleSaveEdit(album)} disabled={isPending} style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: '#30D158', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={13} strokeWidth={2.5} />
                    </button>
                    <button className="pm-btn" onClick={() => setEditingId(null)} style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={13} strokeWidth={2} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="pm-btn" onClick={() => handleToggle(album)} disabled={isPending} title={album.is_visible ? 'Ocultar' : 'Mostrar'} style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: album.is_visible ? 'var(--dash-text-secondary)' : '#3A3A3C', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {album.is_visible ? <Eye size={13} strokeWidth={1.5} /> : <EyeOff size={13} strokeWidth={1.5} />}
                    </button>
                    <button className="pm-btn" onClick={() => { setEditingId(album.id); setEditLabel(album.label); setError(null) }} title="Renombrar" style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: 'var(--dash-text-secondary)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✎
                    </button>
                    <button className="pm-btn pm-del" onClick={() => handleDelete(album)} disabled={isPending} title="Eliminar album" style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: 'var(--dash-text-secondary)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Expanded photo grid */}
            {expandedId === album.id && (
              <PhotoGrid
                album={album}
                onPhotosChange={handlePhotosChange}
              />
            )}
          </div>
        ))}

        {sorted.length === 0 && (
          <p style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--dash-text-tertiary)', margin: 0 }}>
            No hay albums. Crea uno para empezar.
          </p>
        )}
      </div>
    </div>
  )
}
