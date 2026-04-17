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
  Plus, Trash2, Eye, EyeOff, X, Check, Upload, ArrowLeft, Pencil,
  GripVertical, ChevronRight, FolderOpen, ImagePlus,
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
  parent_id: string | null
  cover_url?: string | null
  portfolio_photos: Photo[]
}

// ─── Sortable album card ──────────────────────────────────────────────────────

function SortableAlbumCard({
  album,
  onOpen,
  onToggleVisibility,
  onRename,
  onDelete,
  onSetCover,
  isDeleting,
  isSubAlbum,
}: {
  album: Album
  onOpen: (album: Album) => void
  onToggleVisibility: (album: Album) => void
  onRename: (album: Album) => void
  onDelete: (album: Album) => void
  onSetCover?: (album: Album) => void
  isDeleting: boolean
  isSubAlbum?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: album.id,
  })

  const sorted = [...album.portfolio_photos].sort((a, b) => a.sort_order - b.sort_order)
  const coverPhotos = sorted.slice(0, 4)
  const hasCoverUrl = Boolean(album.cover_url)

  return (
    <div
      ref={setNodeRef}
      className="pm-album-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : isDeleting ? 0.4 : album.is_visible ? 1 : 0.5,
        borderRadius: isSubAlbum ? 10 : 12,
        overflow: 'hidden',
        background: 'var(--dash-surface-2)',
        border: `1px solid ${isSubAlbum ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)'}`,
        cursor: 'default',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Cover — custom URL or mosaic of first 4 photos */}
      <div
        onClick={() => !isDragging && onOpen(album)}
        style={{
          width: '100%',
          aspectRatio: '4/3',
          background: 'var(--dash-surface-3)',
          display: hasCoverUrl ? 'block' : 'grid',
          gridTemplateColumns: !hasCoverUrl && coverPhotos.length >= 2 ? '1fr 1fr' : '1fr',
          gridTemplateRows: !hasCoverUrl && coverPhotos.length >= 3 ? '1fr 1fr' : '1fr',
          gap: 1,
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {hasCoverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.cover_url!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <>
            {coverPhotos.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.08)', fontSize: 28 }}>
                <FolderOpen size={28} strokeWidth={1} />
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
          </>
        )}
        {/* Set cover button overlay */}
        {onSetCover && (
          <button
            className="pm-cover-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSetCover(album) }}
            title="Cambiar miniatura"
            style={{
              position: 'absolute', bottom: 5, right: 5,
              width: 26, height: 26, borderRadius: 6,
              background: 'rgba(0,0,0,0.65)', border: 'none',
              color: '#fff', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.15s',
            }}
          >
            <ImagePlus size={12} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: 'var(--dash-text-tertiary)', display: 'flex', flexShrink: 0, touchAction: 'none' }}
        >
          <GripVertical size={13} strokeWidth={1.5} />
        </div>

        <div
          onClick={() => !isDragging && onOpen(album)}
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
        >
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--dash-text-primary)', fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {album.label}
          </p>
          <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>
            {album.portfolio_photos.length} foto{album.portfolio_photos.length !== 1 ? 's' : ''}
            {!album.is_visible && <span style={{ marginLeft: 5, color: '#FF453A' }}>oculto</span>}
          </p>
        </div>

        <div className="pm-card-actions" style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s' }}>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(album) }}
            title={album.is_visible ? 'Ocultar' : 'Mostrar'}
            className="pm-icon-btn"
            style={{ width: 24, height: 24, borderRadius: 5, background: 'transparent', border: 'none', color: 'var(--dash-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {album.is_visible ? <Eye size={11} strokeWidth={1.5} /> : <EyeOff size={11} strokeWidth={1.5} />}
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRename(album) }}
            title="Renombrar"
            className="pm-icon-btn"
            style={{ width: 24, height: 24, borderRadius: 5, background: 'transparent', border: 'none', color: 'var(--dash-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Pencil size={10} strokeWidth={1.5} />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(album) }}
            title="Eliminar"
            className="pm-icon-btn pm-icon-del"
            style={{ width: 24, height: 24, borderRadius: 5, background: 'transparent', border: 'none', color: 'var(--dash-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Trash2 size={10} strokeWidth={1.5} />
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
      <div
        className="pm-photo-overlay"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onPreview(photo) }}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0)',
          transition: 'background 0.15s',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
          padding: 5, gap: 4, cursor: 'pointer',
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

// ─── Album detail (photos + sub-albums) ──────────────────────────────────────

function AlbumDetail({
  album,
  subAlbums,
  onBack,
  onPhotosChange,
  onToggleVisibility,
  onDelete,
  onNavigateInto,
  onAlbumCreated,
  onAlbumUpdated,
  onAlbumDeleted,
  onSetCover,
}: {
  album: Album
  subAlbums: Album[]
  onBack: () => void
  onPhotosChange: (albumId: string, photos: Photo[]) => void
  onToggleVisibility: (album: Album) => void
  onDelete: (album: Album) => void
  onNavigateInto: (album: Album) => void
  onAlbumCreated: (album: Album) => void
  onAlbumUpdated: (id: string, patch: Partial<Album>) => void
  onAlbumDeleted: (id: string) => void
  onSetCover?: (album: Album) => void
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

  // Sub-album creation
  const [showNewSub, setShowNewSub] = useState(false)
  const [newSubLabel, setNewSubLabel] = useState('')
  const [subPending, startSubTransition] = useTransition()
  const [subError, setSubError] = useState<string | null>(null)

  // Sub-album rename
  const [renamingSubId, setRenamingSubId] = useState<string | null>(null)
  const [renameSubLabel, setRenameSubLabel] = useState('')
  const [, startRenameTransition] = useTransition()

  const [deletingSubId, setDeletingSubId] = useState<string | null>(null)

  const photoDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const subDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sortedSubAlbums = [...subAlbums].sort((a, b) => a.sort_order - b.sort_order)

  const INPUT: React.CSSProperties = {
    backgroundColor: 'var(--dash-surface-2)',
    border: '1px solid var(--dash-border)',
    borderRadius: 8,
    padding: '7px 11px',
    fontSize: 13,
    color: 'var(--dash-text-primary)',
    fontFamily: FONT,
    outline: 'none',
    boxSizing: 'border-box',
  }

  // ── Photo upload ────────────────────────────────────────────────────────────

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
        const { id: realId } = await addPhoto(album.id, storagePath, altText, nextOrder, publicUrl)
        const newPhoto: Photo = { id: realId, album_id: album.id, storage_path: storagePath, url: publicUrl, alt_text: altText, sort_order: nextOrder }
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

  // ── Photo drag-and-drop reorder ─────────────────────────────────────────────

  function handlePhotoDragEnd(event: DragEndEvent) {
    if (uploading) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = photos.findIndex((p) => p.id === active.id)
    const newIdx = photos.findIndex((p) => p.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = arrayMove(photos, oldIdx, newIdx).map((p, i) => ({ ...p, sort_order: i }))
    setPhotos(reordered)
    onPhotosChange(album.id, reordered)
    const toSave = reordered.filter((p) => !p.id.startsWith('temp-'))
    if (toSave.length === 0) return
    startTransition(async () => {
      await reorderPhotos(toSave.map((p) => ({ id: p.id, sort_order: p.sort_order })))
    })
  }

  // ── Photo delete ────────────────────────────────────────────────────────────

  async function handleDeletePhoto(photo: Photo) {
    if (!window.confirm('¿Eliminar esta foto?')) return
    setDeletingId(photo.id)
    try {
      await deletePhoto(photo.id, photo.storage_path)
      setPhotos((prev) => {
        const updated = prev.filter((p) => p.id !== photo.id)
        onPhotosChange(album.id, updated)
        return updated
      })
    } catch (err) {
      setUploadErrors([err instanceof Error ? err.message : 'Error al eliminar'])
    } finally {
      setDeletingId(null)
    }
  }

  // ── Sub-album actions ───────────────────────────────────────────────────────

  function handleCreateSubAlbum(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubLabel.trim()) return
    setSubError(null)
    const fd = new FormData()
    fd.set('label', newSubLabel.trim())
    startSubTransition(async () => {
      try {
        const newAlbum = await createAlbum(fd, album.id)
        onAlbumCreated(newAlbum)
        setShowNewSub(false)
        setNewSubLabel('')
      } catch (err) {
        setSubError(err instanceof Error ? err.message : 'Error al crear')
      }
    })
  }

  function handleSubAlbumDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sortedSubAlbums.findIndex((a) => a.id === active.id)
    const newIdx = sortedSubAlbums.findIndex((a) => a.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = arrayMove(sortedSubAlbums, oldIdx, newIdx)
    reordered.forEach((a, i) => onAlbumUpdated(a.id, { sort_order: i }))
    startTransition(async () => {
      await Promise.all(reordered.map((a, i) => updateAlbum(a.id, { sort_order: i })))
    })
  }

  function handleToggleSub(sub: Album) {
    const next = !sub.is_visible
    onAlbumUpdated(sub.id, { is_visible: next })
    startTransition(async () => {
      try {
        await updateAlbum(sub.id, { is_visible: next })
      } catch {
        onAlbumUpdated(sub.id, { is_visible: sub.is_visible })
      }
    })
  }

  function handleRenameSub(sub: Album) {
    setRenamingSubId(sub.id)
    setRenameSubLabel(sub.label)
  }

  function handleSaveRenameSub(sub: Album) {
    const trimmed = renameSubLabel.trim()
    if (!trimmed) return
    startRenameTransition(async () => {
      try {
        await updateAlbum(sub.id, { label: trimmed })
        onAlbumUpdated(sub.id, { label: trimmed })
        setRenamingSubId(null)
      } catch { /* no-op */ }
    })
  }

  function handleDeleteSub(sub: Album) {
    if (!window.confirm(`¿Eliminar el sub-álbum "${sub.label}" y todas sus fotos?`)) return
    setDeletingSubId(sub.id)
    startTransition(async () => {
      try {
        await deleteAlbum(sub.id)
        onAlbumDeleted(sub.id)
        router.refresh()
      } catch { /* no-op */ }
      finally { setDeletingSubId(null) }
    })
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
          Atrás
        </button>

        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--dash-text-primary)', flex: 1, minWidth: 80, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {album.label}
        </h3>

        <span style={{ fontSize: 12, color: 'var(--dash-text-tertiary)', flexShrink: 0 }}>
          {photos.length} foto{photos.length !== 1 ? 's' : ''}
        </span>

        <button
          onClick={() => onToggleVisibility(album)}
          title={album.is_visible ? 'Ocultar' : 'Mostrar'}
          style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', color: album.is_visible ? 'var(--dash-text-secondary)' : '#FF453A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          {album.is_visible ? <Eye size={14} strokeWidth={1.5} /> : <EyeOff size={14} strokeWidth={1.5} />}
        </button>
        <button
          onClick={() => onDelete(album)}
          title="Eliminar álbum"
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
        onDrop={(e) => { e.preventDefault(); setDropOver(false); if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files) }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          marginBottom: 12,
          padding: '18px 16px',
          borderRadius: 12,
          border: `1.5px dashed ${dropOver ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'}`,
          background: dropOver ? 'rgba(255,255,255,0.04)' : 'transparent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <Upload size={18} strokeWidth={1.5} color={dropOver ? 'var(--dash-text-primary)' : 'var(--dash-text-tertiary)'} />
        <p style={{ margin: 0, fontSize: 13, color: uploading ? 'var(--dash-text-secondary)' : 'var(--dash-text-tertiary)', fontFamily: FONT, textAlign: 'center' }}>
          {uploading ? `Subiendo ${uploadProgress} de ${uploadTotal}...` : 'Arrastra fotos aquí o haz clic para seleccionar'}
        </p>
        {uploading && (
          <div style={{ width: '100%', maxWidth: 240, height: 3, background: 'var(--dash-surface-3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(uploadProgress / Math.max(uploadTotal, 1)) * 100}%`, background: '#0071E3', borderRadius: 2, transition: 'width 0.2s' }} />
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = '' }} />

      {/* Upload errors */}
      {uploadErrors.length > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.25)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#FF453A', fontFamily: FONT }}>{uploadErrors.length === 1 ? '1 error' : `${uploadErrors.length} errores`}</p>
              {uploadErrors.map((e, i) => <p key={i} style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,100,80,0.9)', fontFamily: FONT }}>{e}</p>)}
            </div>
            <button onClick={() => setUploadErrors([])} style={{ flexShrink: 0, width: 20, height: 20, background: 'transparent', border: 'none', color: '#FF453A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <DndContext sensors={photoDndSensors} collisionDetection={closestCenter} onDragEnd={handlePhotoDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6, pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.6 : 1, transition: 'opacity 0.2s', marginBottom: 24 }}>
              {photos.map((photo) => (
                <SortablePhoto key={photo.id} photo={photo} onDelete={handleDeletePhoto} deletingId={deletingId} onPreview={setPreview} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {photos.length === 0 && !uploading && (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--dash-text-tertiary)', padding: '16px 0 24px', margin: 0 }}>
          Álbum vacío — sube fotos para empezar
        </p>
      )}

      {/* ── Sub-albums section ─────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dash-text-secondary)', fontFamily: FONT }}>
              Sub-álbumes
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>
              Agrupa fotos dentro de este álbum
            </p>
          </div>
          <button
            onClick={() => { setShowNewSub(true); setSubError(null) }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', borderRadius: 7, fontSize: 12, color: 'var(--dash-text-primary)', cursor: 'pointer', fontFamily: FONT }}
          >
            <Plus size={12} strokeWidth={2} />
            Nuevo sub-álbum
          </button>
        </div>

        {subError && <p style={{ fontSize: 12, color: '#FF453A', marginBottom: 10 }}>{subError}</p>}

        {/* New sub-album form */}
        {showNewSub && (
          <form
            onSubmit={handleCreateSubAlbum}
            style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, padding: 10, background: 'var(--dash-surface-2)', borderRadius: 9, border: '1px solid var(--dash-border)' }}
          >
            <input
              value={newSubLabel}
              onChange={(e) => setNewSubLabel(e.target.value)}
              placeholder="Nombre del sub-álbum"
              required
              autoFocus
              style={{ ...INPUT, flex: 1 }}
            />
            <button type="submit" disabled={subPending || !newSubLabel.trim()} style={{ padding: '7px 14px', background: '#0071E3', border: 'none', borderRadius: 7, fontSize: 12, color: '#fff', cursor: 'pointer', opacity: subPending ? 0.5 : 1, fontFamily: FONT }}>
              {subPending ? '...' : 'Crear'}
            </button>
            <button type="button" onClick={() => { setShowNewSub(false); setNewSubLabel('') }} style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} />
            </button>
          </form>
        )}

        {/* Rename sub-album inline */}
        {renamingSubId && (() => {
          const sub = subAlbums.find((a) => a.id === renamingSubId)
          if (!sub) return null
          return (
            <div style={{ marginBottom: 14, padding: 10, background: 'var(--dash-surface-2)', borderRadius: 9, border: '1px solid var(--dash-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--dash-text-tertiary)', flexShrink: 0 }}>Renombrar:</span>
              <input value={renameSubLabel} onChange={(e) => setRenameSubLabel(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRenameSub(sub); if (e.key === 'Escape') setRenamingSubId(null) }} style={{ ...INPUT, flex: 1, padding: '5px 9px', fontSize: 12 }} />
              <button onClick={() => handleSaveRenameSub(sub)} style={{ width: 26, height: 26, background: 'transparent', border: 'none', color: '#30D158', cursor: 'pointer', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={13} strokeWidth={2.5} /></button>
              <button onClick={() => setRenamingSubId(null)} style={{ width: 26, height: 26, background: 'transparent', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
            </div>
          )
        })()}

        {sortedSubAlbums.length === 0 && !showNewSub ? (
          <div style={{ padding: '20px 16px', textAlign: 'center', background: 'var(--dash-surface-1)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--dash-text-tertiary)' }}>Sin sub-álbumes todavía</p>
          </div>
        ) : (
          <DndContext sensors={subDndSensors} collisionDetection={closestCenter} onDragEnd={handleSubAlbumDragEnd}>
            <SortableContext items={sortedSubAlbums.map((a) => a.id)} strategy={rectSortingStrategy}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {sortedSubAlbums.map((sub) => (
                  <SortableAlbumCard
                    key={sub.id}
                    album={sub}
                    onOpen={onNavigateInto}
                    onToggleVisibility={handleToggleSub}
                    onRename={handleRenameSub}
                    onDelete={handleDeleteSub}
                    onSetCover={onSetCover}
                    isDeleting={deletingSubId === sub.id}
                    isSubAlbum
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Lightbox */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolvePhotoUrl(preview)} alt={preview.alt_text} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={() => setPreview(null)} style={{ position: 'fixed', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main PhotoManager ────────────────────────────────────────────────────────

export default function PhotoManager({ initialAlbums, compact = false }: { initialAlbums: Album[]; compact?: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [albums, setAlbums] = useState<Album[]>(initialAlbums)
  // navStack: breadcrumb of opened albums. [] = root grid
  const [navStack, setNavStack] = useState<Album[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameLabel, setRenameLabel] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [coverAlbumId, setCoverAlbumId] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState('')
  const [coverPending, startCoverTransition] = useTransition()

  // Root albums only (no parent)
  const rootAlbums = [...albums.filter((a) => !a.parent_id)].sort((a, b) => a.sort_order - b.sort_order)

  // Current album from navStack
  const currentAlbum = navStack.length > 0 ? albums.find((a) => a.id === navStack[navStack.length - 1].id) ?? navStack[navStack.length - 1] : null

  // Sub-albums of current album
  const currentSubAlbums = currentAlbum ? albums.filter((a) => a.parent_id === currentAlbum.id) : []

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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function patchAlbum(id: string, patch: Partial<Album>) {
    setAlbums((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a))
    setNavStack((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a))
  }

  function removeAlbum(id: string) {
    setAlbums((prev) => prev.filter((a) => a.id !== id && a.parent_id !== id))
    setNavStack((prev) => {
      const idx = prev.findIndex((a) => a.id === id)
      return idx === -1 ? prev : prev.slice(0, idx)
    })
  }

  function handlePhotosChange(albumId: string, photos: Photo[]) {
    setAlbums((prev) => prev.map((a) => a.id === albumId ? { ...a, portfolio_photos: photos } : a))
  }

  // ── Create root album ───────────────────────────────────────────────────────

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newLabel.trim()) return
    setError(null)
    const fd = new FormData()
    fd.set('label', newLabel.trim())
    startTransition(async () => {
      try {
        const newAlbum = await createAlbum(fd)
        setAlbums((prev) => [...prev, newAlbum])
        setShowNew(false)
        setNewLabel('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al crear')
      }
    })
  }

  // ── Rename ──────────────────────────────────────────────────────────────────

  function handleSaveRename(album: Album) {
    const trimmed = renameLabel.trim()
    if (!trimmed) return
    startTransition(async () => {
      try {
        await updateAlbum(album.id, { label: trimmed })
        patchAlbum(album.id, { label: trimmed })
        setRenamingId(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
  }

  // ── Visibility ──────────────────────────────────────────────────────────────

  function handleToggle(album: Album) {
    const next = !album.is_visible
    patchAlbum(album.id, { is_visible: next })
    startTransition(async () => {
      try { await updateAlbum(album.id, { is_visible: next }) }
      catch { patchAlbum(album.id, { is_visible: album.is_visible }) }
    })
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  function handleDelete(album: Album) {
    if (!window.confirm(`¿Eliminar "${album.label}" y todas sus fotos y sub-álbumes?`)) return
    setDeletingId(album.id)
    startTransition(async () => {
      try {
        await deleteAlbum(album.id)
        removeAlbum(album.id)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar')
      } finally {
        setDeletingId(null)
      }
    })
  }

  // ── Root album drag-and-drop ─────────────────────────────────────────────────

  function handleAlbumDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = rootAlbums.findIndex((a) => a.id === active.id)
    const newIdx = rootAlbums.findIndex((a) => a.id === over.id)
    const reordered = arrayMove(rootAlbums, oldIdx, newIdx)
    setAlbums((prev) => {
      const roots = new Map(reordered.map((a, i) => [a.id, i]))
      return prev.map((a) => roots.has(a.id) ? { ...a, sort_order: roots.get(a.id)! } : a)
    })
    startTransition(async () => {
      await Promise.all(reordered.map((a, i) => updateAlbum(a.id, { sort_order: i })))
    })
  }

  // ── Cover / thumbnail ────────────────────────────────────────────────────────

  function handleSetCover(album: Album) {
    setCoverAlbumId(album.id)
    setCoverUrl(album.cover_url ?? '')
  }

  function handleSaveCover() {
    if (!coverAlbumId) return
    const url = coverUrl.trim() || null
    patchAlbum(coverAlbumId, { cover_url: url })
    const id = coverAlbumId
    setCoverAlbumId(null)
    startCoverTransition(async () => {
      try { await updateAlbum(id, { cover_url: url }) }
      catch { /* revert */ patchAlbum(id, { cover_url: albums.find((a) => a.id === id)?.cover_url }) }
    })
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  function navigateInto(album: Album) {
    setNavStack((prev) => [...prev, album])
  }

  function navigateBack() {
    setNavStack((prev) => prev.slice(0, -1))
  }

  function navigateTo(idx: number) {
    setNavStack((prev) => prev.slice(0, idx + 1))
  }

  // ── Render: album detail view ────────────────────────────────────────────────

  if (currentAlbum) {
    return (
      <div style={{ fontFamily: FONT }}>
        <style>{`
          .pm-album-card:hover .pm-card-actions { opacity: 1 !important; }
          .pm-icon-btn { transition: background 0.12s, color 0.12s; }
          .pm-icon-btn:hover { background: var(--dash-surface-3) !important; color: var(--dash-text-primary) !important; }
          .pm-icon-del:hover { background: rgba(255,69,58,0.15) !important; color: #FF453A !important; }
          .pm-photo-cell:hover .pm-delete-btn { opacity: 1 !important; }
          .pm-photo-cell:hover .pm-photo-overlay { background: rgba(0,0,0,0.25) !important; }
          .pm-album-card:hover .pm-cover-btn { opacity: 1 !important; }
        `}</style>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            onClick={() => setNavStack([])}
            style={{ background: 'none', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', fontSize: 13, fontFamily: FONT, padding: '2px 4px', borderRadius: 4 }}
          >
            Álbumes
          </button>
          {navStack.map((a, i) => (
            <span key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ChevronRight size={12} strokeWidth={1.5} color="var(--dash-text-tertiary)" />
              {i < navStack.length - 1 ? (
                <button
                  onClick={() => navigateTo(i)}
                  style={{ background: 'none', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', fontSize: 13, fontFamily: FONT, padding: '2px 4px', borderRadius: 4 }}
                >
                  {a.label}
                </button>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--dash-text-primary)', fontWeight: 600, fontFamily: FONT, padding: '2px 4px' }}>
                  {albums.find((al) => al.id === a.id)?.label ?? a.label}
                </span>
              )}
            </span>
          ))}
        </div>

        <AlbumDetail
          album={currentAlbum}
          subAlbums={currentSubAlbums}
          onBack={navigateBack}
          onPhotosChange={handlePhotosChange}
          onToggleVisibility={handleToggle}
          onDelete={handleDelete}
          onNavigateInto={navigateInto}
          onAlbumCreated={(newAlbum) => setAlbums((prev) => [...prev, newAlbum])}
          onAlbumUpdated={patchAlbum}
          onAlbumDeleted={removeAlbum}
          onSetCover={handleSetCover}
        />

      {/* Cover URL modal (detail view) */}
      {coverAlbumId && (
        <div
          onClick={() => setCoverAlbumId(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', borderRadius: 12, padding: 20, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--dash-text-primary)', fontFamily: FONT }}>Miniatura del álbum</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>Pega una URL de imagen para usar como portada. Déjalo vacío para usar el mosaico automático.</p>
            <input
              autoFocus
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
              style={{ backgroundColor: 'var(--dash-surface-3)', border: '1px solid var(--dash-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--dash-text-primary)', fontFamily: FONT, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCoverAlbumId(null)} style={{ padding: '7px 14px', background: 'var(--dash-surface-3)', border: '1px solid var(--dash-border)', borderRadius: 7, fontSize: 12, color: 'var(--dash-text-secondary)', cursor: 'pointer', fontFamily: FONT }}>
                Cancelar
              </button>
              <button onClick={handleSaveCover} disabled={coverPending} style={{ padding: '7px 14px', background: '#0071E3', border: 'none', borderRadius: 7, fontSize: 12, color: '#fff', cursor: 'pointer', opacity: coverPending ? 0.5 : 1, fontFamily: FONT }}>
                {coverPending ? '...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    )
  }

  // ── Render: root albums grid ─────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`
        .pm-album-card:hover .pm-card-actions { opacity: 1 !important; }
        .pm-icon-btn { transition: background 0.12s, color 0.12s; }
        .pm-icon-btn:hover { background: var(--dash-surface-3) !important; color: var(--dash-text-primary) !important; }
        .pm-icon-del:hover { background: rgba(255,69,58,0.15) !important; color: #FF453A !important; }
        .pm-photo-cell:hover .pm-delete-btn { opacity: 1 !important; }
        .pm-photo-cell:hover .pm-photo-overlay { background: rgba(0,0,0,0.25) !important; }
        .pm-album-card:hover .pm-cover-btn { opacity: 1 !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? 12 : 20 }}>
        {!compact && (
          <div>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dash-text-secondary)' }}>
              Álbumes de fotografías
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--dash-text-tertiary)' }}>
              Arrastra para reordenar · Clic para abrir · Dentro de cada álbum puedes crear sub-álbumes
            </p>
          </div>
        )}
        <button
          onClick={() => { setShowNew(true); setError(null) }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: compact ? '5px 10px' : '7px 14px', background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', borderRadius: 8, fontSize: compact ? 12 : 13, color: 'var(--dash-text-primary)', cursor: 'pointer', fontFamily: FONT, flexShrink: 0, marginLeft: 'auto' }}
        >
          <Plus size={compact ? 11 : 13} strokeWidth={2} />
          Nuevo álbum
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: '#FF453A', marginBottom: 12 }}>{error}</p>}

      {/* New album form */}
      {showNew && (
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: compact ? 10 : 16, padding: compact ? 9 : 12, background: 'var(--dash-surface-2)', borderRadius: 10, border: '1px solid var(--dash-border)' }}>
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Nombre del álbum (ej. Retratos)" required autoFocus style={{ ...INPUT, flex: 1 }} />
          <button type="submit" disabled={isPending || !newLabel.trim()} style={{ padding: '8px 16px', background: '#0071E3', border: 'none', borderRadius: 8, fontSize: 13, color: '#fff', cursor: 'pointer', opacity: isPending ? 0.5 : 1, fontFamily: FONT }}>
            {isPending ? '...' : 'Crear'}
          </button>
          <button type="button" onClick={() => { setShowNew(false); setNewLabel('') }} style={{ width: 32, height: 32, background: 'transparent', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <input value={renameLabel} onChange={(e) => setRenameLabel(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(album); if (e.key === 'Escape') setRenamingId(null) }} style={{ ...INPUT, flex: 1, padding: '6px 10px', fontSize: 13 }} />
            <button onClick={() => handleSaveRename(album)} disabled={isPending} style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: '#30D158', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={14} strokeWidth={2.5} /></button>
            <button onClick={() => setRenamingId(null)} style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} strokeWidth={2} /></button>
          </div>
        )
      })()}

      {/* Albums grid */}
      {rootAlbums.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--dash-surface-1)', border: '1px solid var(--dash-border)', borderRadius: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--dash-text-tertiary)' }}>No hay álbumes. Crea uno para empezar.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAlbumDragEnd}>
          <SortableContext items={rootAlbums.map((a) => a.id)} strategy={rectSortingStrategy}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? '130px' : '190px'}, 1fr))`, gap: compact ? 8 : 12 }}>
              {rootAlbums.map((album) => (
                <SortableAlbumCard
                  key={album.id}
                  album={album}
                  onOpen={navigateInto}
                  onToggleVisibility={handleToggle}
                  onRename={(a) => { setRenamingId(a.id); setRenameLabel(a.label); setError(null) }}
                  onDelete={handleDelete}
                  onSetCover={handleSetCover}
                  isDeleting={deletingId === album.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Cover URL modal */}
      {coverAlbumId && (
        <div
          onClick={() => setCoverAlbumId(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', borderRadius: 12, padding: 20, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--dash-text-primary)', fontFamily: FONT }}>Miniatura del álbum</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>Pega una URL de imagen para usar como portada. Déjalo vacío para usar el mosaico automático.</p>
            <input
              autoFocus
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
              style={{ backgroundColor: 'var(--dash-surface-3)', border: '1px solid var(--dash-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--dash-text-primary)', fontFamily: FONT, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCoverAlbumId(null)} style={{ padding: '7px 14px', background: 'var(--dash-surface-3)', border: '1px solid var(--dash-border)', borderRadius: 7, fontSize: 12, color: 'var(--dash-text-secondary)', cursor: 'pointer', fontFamily: FONT }}>
                Cancelar
              </button>
              <button onClick={handleSaveCover} disabled={coverPending} style={{ padding: '7px 14px', background: '#0071E3', border: 'none', borderRadius: 7, fontSize: 12, color: '#fff', cursor: 'pointer', opacity: coverPending ? 0.5 : 1, fontFamily: FONT }}>
                {coverPending ? '...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
