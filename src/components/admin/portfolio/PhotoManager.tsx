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
import { Plus, Trash2, Eye, EyeOff, X, Check, Upload, ArrowLeft, Pencil, GripVertical } from 'lucide-react'
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

function resolvePhotoUrl(photo: Photo) {
  if (photo.url) return photo.url
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${photo.storage_path}`
}

export interface Photo {
  id: string
  album_id: string
  storage_path: string
  url?: string | null
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

// ─── Sortable album card ──────────────────────────────────────────────────────

function SortableAlbumCard({
  album,
  onOpen,
  onToggleVisibility,
  onRename,
  onDelete,
  isDeleting,
}: {
  album: Album
  onOpen: (album: Album) => void
  onToggleVisibility: (album: Album) => void
  onRename: (album: Album) => void
  onDelete: (album: Album) => void
  isDeleting: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: album.id,
  })

  const sorted = [...album.portfolio_photos].sort((a, b) => a.sort_order - b.sort_order)
  const coverPhotos = sorted.slice(0, 4)

  return (
    <div
      ref={setNodeRef}
      className="pm-album-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : isDeleting ? 0.4 : album.is_visible ? 1 : 0.5,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--dash-surface-2)',
        border: '1px solid rgba(255,255,255,0.07)',
        cursor: 'default',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Cover mosaic — clickable to open */}
      <div
        onClick={() => !isDragging && onOpen(album)}
        style={{
          width: '100%',
          aspectRatio: '4/3',
          background: 'var(--dash-surface-3)',
          display: 'grid',
          gridTemplateColumns: coverPhotos.length >= 2 ? '1fr 1fr' : '1fr',
          gridTemplateRows: coverPhotos.length >= 3 ? '1fr 1fr' : '1fr',
          gap: 1,
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {coverPhotos.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)', fontSize: 32 }}>
            ⬜
          </div>
        )}
        {coverPhotos.map((photo) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.id}
            src={resolvePhotoUrl(photo)}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: 'var(--dash-text-tertiary)', display: 'flex', flexShrink: 0, touchAction: 'none' }}
        >
          <GripVertical size={14} strokeWidth={1.5} />
        </div>

        {/* Name + count */}
        <div
          onClick={() => !isDragging && onOpen(album)}
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
        >
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--dash-text-primary)', fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {album.label}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>
            {album.portfolio_photos.length} foto{album.portfolio_photos.length !== 1 ? 's' : ''}
            {!album.is_visible && <span style={{ marginLeft: 6, color: '#FF453A' }}>oculto</span>}
          </p>
        </div>

        {/* Quick actions */}
        <div className="pm-card-actions" style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s' }}>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(album) }}
            title={album.is_visible ? 'Ocultar' : 'Mostrar'}
            className="pm-icon-btn"
            style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--dash-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {album.is_visible ? <Eye size={12} strokeWidth={1.5} /> : <EyeOff size={12} strokeWidth={1.5} />}
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRename(album) }}
            title="Renombrar"
            className="pm-icon-btn"
            style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--dash-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Pencil size={11} strokeWidth={1.5} />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(album) }}
            title="Eliminar album"
            className="pm-icon-btn pm-icon-del"
            style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--dash-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Trash2 size={11} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sortable photo cell ──────────────────────────────────────────────────────

function SortablePhoto({
  photo,
  onDelete,
  deletingId,
  onPreview,
}: {
  photo: Photo
  onDelete: (photo: Photo) => void
  deletingId: string | null
  onPreview: (photo: Photo) => void
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
        opacity: isDragging || deletingId === photo.id ? 0.35 : 1,
        position: 'relative',
        aspectRatio: '1',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--dash-surface-3)',
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvePhotoUrl(photo)}
        alt={photo.alt_text}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
      />

      {/* Hover overlay — click on photo opens preview */}
      <div
        className="pm-photo-overlay"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onPreview(photo) }}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0)',
          transition: 'background 0.15s',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: 5,
          gap: 4,
          cursor: 'pointer',
        }}
      >
        <button
          className="pm-delete-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(photo) }}
          disabled={deletingId === photo.id}
          title="Eliminar"
          style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'rgba(0,0,0,0.75)', border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s', padding: 0,
          }}
        >
          <Trash2 size={10} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

// ─── Album detail (photo grid) ────────────────────────────────────────────────

function AlbumDetail({
  album,
  onBack,
  onPhotosChange,
  onToggleVisibility,
  onDelete,
}: {
  album: Album
  onBack: () => void
  onPhotosChange: (albumId: string, photos: Photo[]) => void
  onToggleVisibility: (album: Album) => void
  onDelete: (album: Album) => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [photos, setPhotos] = useState<Photo[]>(
    [...album.portfolio_photos].sort((a, b) => a.sort_order - b.sort_order),
  )
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadTotal, setUploadTotal] = useState(0)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dropOver, setDropOver] = useState(false)
  const [preview, setPreview] = useState<Photo | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!arr.length) return
    setUploading(true)
    setUploadProgress(0)
    setUploadTotal(arr.length)
    setUploadErrors([])

    const errs: string[] = []
    let nextOrder = photos.length > 0 ? Math.max(...photos.map((p) => p.sort_order)) + 1 : 0

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i]
      const ext = file.name.split('.').pop() ?? 'jpg'
      const storagePath = `fotografia/${album.slug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false })

      if (uploadError) {
        errs.push(`${file.name}: ${uploadError.message}`)
        setUploadProgress(i + 1)
        continue
      }

      const altText = file.name.replace(/\.[^/.]+$/, '')
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
      try {
        await addPhoto(album.id, storagePath, altText, nextOrder, publicUrl)
        const newPhoto: Photo = {
          id: `temp-${Date.now()}-${i}`,
          album_id: album.id,
          storage_path: storagePath,
          url: publicUrl,
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
        errs.push(`${file.name}: ${err instanceof Error ? err.message : 'Error al guardar'}`)
      }
      setUploadProgress(i + 1)
    }

    setUploading(false)
    if (errs.length > 0) setUploadErrors(errs)
    router.refresh()
  }

  function handleDragEnd(event: DragEndEvent) {
    if (uploading) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = photos.findIndex((p) => p.id === active.id)
    const newIdx = photos.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(photos, oldIdx, newIdx).map((p, i) => ({ ...p, sort_order: i }))
    setPhotos(reordered)
    onPhotosChange(album.id, reordered)
    startTransition(async () => {
      await reorderPhotos(reordered.map((p) => ({ id: p.id, sort_order: p.sort_order })))
    })
  }

  async function handleDelete(photo: Photo) {
    if (!window.confirm('¿Eliminar esta foto?')) return
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

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDropOver(false)
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files)
  }

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', borderRadius: 8, fontSize: 13, color: 'var(--dash-text-secondary)', cursor: 'pointer', fontFamily: FONT, flexShrink: 0 }}
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Albums
        </button>

        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--dash-text-primary)', flex: 1, minWidth: 80, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {album.label}
        </h3>

        <span style={{ fontSize: 12, color: 'var(--dash-text-tertiary)', flexShrink: 0 }}>
          {photos.length} foto{photos.length !== 1 ? 's' : ''}
        </span>

        <button
          onClick={() => onToggleVisibility(album)}
          title={album.is_visible ? 'Ocultar album' : 'Mostrar album'}
          style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', color: album.is_visible ? 'var(--dash-text-secondary)' : '#FF453A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          {album.is_visible ? <Eye size={14} strokeWidth={1.5} /> : <EyeOff size={14} strokeWidth={1.5} />}
        </button>

        <button
          onClick={() => onDelete(album)}
          title="Eliminar album"
          style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', color: 'var(--dash-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Upload zone */}
      <div
        ref={dropZoneRef}
        onDragOver={(e) => { e.preventDefault(); setDropOver(true) }}
        onDragLeave={(e) => { if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) setDropOver(false) }}
        onDrop={handleFileDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          marginBottom: 16,
          padding: '20px 16px',
          borderRadius: 12,
          border: `1.5px dashed ${dropOver ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'}`,
          background: dropOver ? 'rgba(255,255,255,0.04)' : 'transparent',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <Upload size={20} strokeWidth={1.5} color={dropOver ? 'var(--dash-text-primary)' : 'var(--dash-text-tertiary)'} />
        <p style={{ margin: 0, fontSize: 13, color: uploading ? 'var(--dash-text-secondary)' : 'var(--dash-text-tertiary)', fontFamily: FONT, textAlign: 'center' }}>
          {uploading
            ? `Subiendo ${uploadProgress} de ${uploadTotal}...`
            : 'Arrastra fotos aquí o haz clic para seleccionar'}
        </p>
        {/* Progress bar */}
        {uploading && (
          <div style={{ width: '100%', maxWidth: 240, height: 3, background: 'var(--dash-surface-3)', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(uploadProgress / Math.max(uploadTotal, 1)) * 100}%`,
                background: '#0071E3',
                borderRadius: 2,
                transition: 'width 0.2s',
              }}
            />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = '' }}
      />

      {/* Upload errors */}
      {uploadErrors.length > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.25)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#FF453A', fontFamily: FONT }}>
                {uploadErrors.length === 1 ? 'Error al subir 1 foto' : `Errores al subir ${uploadErrors.length} fotos`}
              </p>
              {uploadErrors.map((e, i) => (
                <p key={i} style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,100,80,0.9)', fontFamily: FONT }}>{e}</p>
              ))}
            </div>
            <button
              onClick={() => setUploadErrors([])}
              style={{ flexShrink: 0, width: 20, height: 20, background: 'transparent', border: 'none', color: '#FF453A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 6,
                pointerEvents: uploading ? 'none' : 'auto',
                opacity: uploading ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {photos.map((photo) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                  onPreview={setPreview}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        !uploading && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--dash-text-tertiary)', padding: '24px 0', margin: 0 }}>
            Album vacío — sube fotos para empezar
          </p>
        )
      )}

      {/* Lightbox */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvePhotoUrl(preview)}
            alt={preview.alt_text}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
          />
          <button
            onClick={() => setPreview(null)}
            style={{ position: 'fixed', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
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
  const [openAlbum, setOpenAlbum] = useState<Album | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameLabel, setRenameLabel] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sorted = [...albums].sort((a, b) => a.sort_order - b.sort_order)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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

  // ── Create ─────────────────────────────────────────────────────────────────

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

  // ── Rename ─────────────────────────────────────────────────────────────────

  function startRename(album: Album) {
    setRenamingId(album.id)
    setRenameLabel(album.label)
    setError(null)
  }

  function handleSaveRename(album: Album) {
    const trimmed = renameLabel.trim()
    if (!trimmed) return
    startTransition(async () => {
      try {
        await updateAlbum(album.id, { label: trimmed })
        setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, label: trimmed } : a))
        if (openAlbum?.id === album.id) setOpenAlbum((prev) => prev ? { ...prev, label: trimmed } : prev)
        setRenamingId(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
  }

  // ── Visibility ─────────────────────────────────────────────────────────────

  function handleToggle(album: Album) {
    const next = !album.is_visible
    setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, is_visible: next } : a))
    if (openAlbum?.id === album.id) setOpenAlbum((prev) => prev ? { ...prev, is_visible: next } : prev)
    startTransition(async () => {
      try {
        await updateAlbum(album.id, { is_visible: next })
      } catch {
        setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, is_visible: album.is_visible } : a))
      }
    })
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  function handleDelete(album: Album) {
    if (!window.confirm(`¿Eliminar el álbum "${album.label}" y todas sus fotos?`)) return
    setDeletingId(album.id)
    startTransition(async () => {
      try {
        await deleteAlbum(album.id)
        setAlbums((prev) => prev.filter((a) => a.id !== album.id))
        if (openAlbum?.id === album.id) setOpenAlbum(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar')
      } finally {
        setDeletingId(null)
      }
    })
  }

  // ── Drag-and-drop album reorder ────────────────────────────────────────────

  function handleAlbumDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sorted.findIndex((a) => a.id === active.id)
    const newIdx = sorted.findIndex((a) => a.id === over.id)
    const reordered = arrayMove(sorted, oldIdx, newIdx)
    setAlbums(reordered.map((a, i) => ({ ...a, sort_order: i })))
    startTransition(async () => {
      // persist all new sort_orders
      await Promise.all(
        reordered.map((a, i) => updateAlbum(a.id, { sort_order: i }))
      )
    })
  }

  // ── Photos change callback ─────────────────────────────────────────────────

  function handlePhotosChange(albumId: string, photos: Photo[]) {
    setAlbums((prev) => prev.map((a) => a.id === albumId ? { ...a, portfolio_photos: photos } : a))
    if (openAlbum?.id === albumId) setOpenAlbum((prev) => prev ? { ...prev, portfolio_photos: photos } : prev)
  }

  // ── Render: detail view ────────────────────────────────────────────────────

  if (openAlbum) {
    const current = albums.find((a) => a.id === openAlbum.id) ?? openAlbum
    return (
      <AlbumDetail
        album={current}
        onBack={() => setOpenAlbum(null)}
        onPhotosChange={handlePhotosChange}
        onToggleVisibility={handleToggle}
        onDelete={(album) => { handleDelete(album) }}
      />
    )
  }

  // ── Render: albums grid ────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`
        .pm-album-card:hover .pm-card-actions { opacity: 1 !important; }
        .pm-icon-btn { transition: background 0.12s, color 0.12s; }
        .pm-icon-btn:hover { background: var(--dash-surface-3) !important; color: var(--dash-text-primary) !important; }
        .pm-icon-del:hover { background: rgba(255,69,58,0.15) !important; color: #FF453A !important; }
        .pm-photo-cell:hover .pm-delete-btn { opacity: 1 !important; }
        .pm-photo-cell:hover .pm-photo-overlay { background: rgba(0,0,0,0.25) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dash-text-secondary)' }}>
            Albums de fotografias
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--dash-text-tertiary)' }}>
            Arrastra las cards para reordenar · Haz clic para abrir un album
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
          style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, padding: 12, background: 'var(--dash-surface-2)', borderRadius: 10, border: '1px solid var(--dash-border)' }}
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
            style={{ width: 32, height: 32, background: 'transparent', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} />
          </button>
        </form>
      )}

      {/* Rename modal */}
      {renamingId && (() => {
        const album = albums.find((a) => a.id === renamingId)
        if (!album) return null
        return (
          <div style={{ marginBottom: 16, padding: 14, background: 'var(--dash-surface-2)', borderRadius: 10, border: '1px solid var(--dash-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--dash-text-tertiary)', flexShrink: 0 }}>Renombrar:</span>
            <input
              value={renameLabel}
              onChange={(e) => setRenameLabel(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(album); if (e.key === 'Escape') setRenamingId(null) }}
              style={{ ...INPUT, flex: 1, padding: '6px 10px', fontSize: 13 }}
            />
            <button onClick={() => handleSaveRename(album)} disabled={isPending} style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: '#30D158', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={14} strokeWidth={2.5} />
            </button>
            <button onClick={() => setRenamingId(null)} style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        )
      })()}

      {/* Album grid */}
      {sorted.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--dash-surface-1)', border: '1px solid var(--dash-border)', borderRadius: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--dash-text-tertiary)' }}>No hay albums. Crea uno para empezar.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAlbumDragEnd}>
          <SortableContext items={sorted.map((a) => a.id)} strategy={rectSortingStrategy}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {sorted.map((album) => (
                <SortableAlbumCard
                  key={album.id}
                  album={album}
                  onOpen={setOpenAlbum}
                  onToggleVisibility={handleToggle}
                  onRename={startRename}
                  onDelete={handleDelete}
                  isDeleting={deletingId === album.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
