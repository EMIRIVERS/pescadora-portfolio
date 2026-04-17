'use client'

import React, { useState, useTransition, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Eye, EyeOff, X, GripVertical, Play, Upload } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  createPortfolioVideo,
  updatePortfolioVideo,
} from '@/lib/actions/portfolio'
import { createClient } from '@/lib/supabase/client'

interface PortfolioVideo {
  id: string
  title: string
  vimeo_id: string
  category: string
  client_name: string
  year: string
  role: string
  description: string
  sort_order: number
  is_visible: boolean
  cover_url?: string | null
  created_at: string
  updated_at: string
}

interface VideoManagerProps {
  initialVideos?: PortfolioVideo[]
  initialCategories?: { id: string; slug: string; label: string }[]
}

type FormMode = 'create' | 'edit'

// Apple-style category pill colours (bg + text as inline style objects)
const CATEGORY_STYLES: Record<string, { background: string; color: string }> = {
  videoclips:   { background: 'rgba(191,90,242,0.15)', color: '#BF5AF2' },
  corporativos: { background: 'rgba(0,113,227,0.15)',  color: '#0A84FF' },
  restaurantes: { background: 'rgba(255,159,10,0.15)', color: '#FF9F0A' },
  comerciales:  { background: 'rgba(48,209,88,0.15)',  color: '#30D158' },
  fotografia:   { background: 'rgba(255,69,58,0.15)',  color: '#FF453A' },
}

const DEFAULT_CATEGORY_STYLE: { background: string; color: string } = {
  background: 'var(--dash-surface-3)',
  color: 'var(--dash-text-secondary)',
}

const CATEGORIES = [
  { value: 'videoclips',   label: 'Videoclips' },
  { value: 'corporativos', label: 'Corporativos' },
  { value: 'restaurantes', label: 'Restaurantes' },
  { value: 'comerciales',  label: 'Comerciales' },
  { value: 'fotografia',   label: 'Fotografía' },
]

// ─── shared style constants ────────────────────────────────────────────────

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--dash-surface-2)',
  border: '1px solid var(--dash-border)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  color: 'var(--dash-text-primary)',
  fontFamily: FONT,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontFamily: FONT,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--dash-text-secondary)',
  marginBottom: 6,
}

// ─── helpers ───────────────────────────────────────────────────────────────

function extractVimeoId(raw: string): string {
  const match = raw.match(/(?:vimeo\.com\/(?:video\/)?)(\d+)/)
  return match ? match[1] : raw.trim()
}

// ─── Vimeo preview modal ────────────────────────────────────────────────────

interface VimeoModalProps {
  vimeoId: string
  title: string
  onClose: () => void
}

function VimeoModal({ vimeoId, title, onClose }: VimeoModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${title}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90vw',
          maxWidth: 900,
          backgroundColor: '#000',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar preview"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <X size={16} strokeWidth={2} />
        </button>
        {/* Title bar */}
        <div style={{ padding: '14px 52px 0 16px' }}>
          <p style={{
            margin: 0,
            fontSize: 13,
            fontFamily: FONT,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {title}
          </p>
        </div>
        {/* 16:9 iframe container */}
        <div style={{ position: 'relative', paddingTop: '56.25%', marginTop: 12 }}>
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&color=0071E3`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allow="autoplay; fullscreen; picture-in-picture"
            title={`Preview: ${title}`}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Sortable row wrapper ────────────────────────────────────────────────────

interface SortableRowProps {
  video: PortfolioVideo
  displayOrder: number
  isChecked: boolean
  isDraggingDisabled: boolean
  onCheck: (id: string, checked: boolean) => void
  onToggleVisibility: (video: PortfolioVideo) => void
  onEdit: (video: PortfolioVideo) => void
  onDelete: (video: PortfolioVideo) => void
  onPreview: (video: PortfolioVideo) => void
  onCategoryClick: (category: string) => void
  activeCategory: string
  togglingId: string | null
  deletingId: string | null
  isPending: boolean
}

function SortableRow({
  video,
  displayOrder,
  isChecked,
  isDraggingDisabled,
  onCheck,
  onToggleVisibility,
  onEdit,
  onDelete,
  onPreview,
  onCategoryClick,
  activeCategory,
  togglingId,
  deletingId,
  isPending,
}: SortableRowProps) {
  const [hovered, setHovered] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id, disabled: isDraggingDisabled })

  const catStyle = CATEGORY_STYLES[video.category] ?? DEFAULT_CATEGORY_STYLE

  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition ?? 'background-color 0.12s',
    backgroundColor: isDragging
      ? 'var(--dash-surface-3)'
      : isChecked
        ? 'rgba(0,113,227,0.06)'
        : hovered
          ? 'var(--dash-surface-2)'
          : 'transparent',
    borderTop: '1px solid var(--dash-border)',
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  }

  return (
    <tr
      ref={setNodeRef}
      style={rowStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <td style={{ padding: '10px 8px 10px 16px', width: 36 }}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onCheck(video.id, e.target.checked)}
          style={{ accentColor: '#0071E3', width: 14, height: 14, cursor: 'pointer' }}
          aria-label={`Seleccionar ${video.title}`}
        />
      </td>

      {/* Drag handle + sort badge */}
      <td style={{ padding: '10px 6px', width: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            type="button"
            {...attributes}
            {...listeners}
            title="Arrastrar para reordenar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              border: 'none',
              background: 'transparent',
              color: hovered ? 'var(--dash-text-secondary)' : 'transparent',
              cursor: isDraggingDisabled ? 'not-allowed' : 'grab',
              borderRadius: 4,
              padding: 0,
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
          >
            <GripVertical size={13} strokeWidth={1.5} />
          </button>
          <span
            style={{
              fontSize: 10,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              color: 'var(--dash-text-tertiary)',
              minWidth: 22,
              textAlign: 'right',
              letterSpacing: '-0.02em',
            }}
          >
            #{displayOrder}
          </span>
        </div>
      </td>

      {/* Thumbnail + title */}
      <td style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              video.category === 'fotografia'
                ? video.vimeo_id
                : (video.cover_url ?? `/api/vimeo-thumb?id=${video.vimeo_id}`)
            }
            alt={video.title}
            width={60}
            height={40}
            style={{
              width: 60,
              height: 40,
              objectFit: 'cover',
              borderRadius: 6,
              backgroundColor: 'var(--dash-surface-3)',
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontFamily: FONT,
                fontWeight: 600,
                color: 'var(--dash-text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {video.title}
            </p>
            {video.client_name && (
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 12,
                  fontFamily: FONT,
                  color: 'var(--dash-text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {video.client_name}
                {video.year ? ` · ${video.year}` : ''}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Category pill — clickable to filter */}
      <td style={{ padding: '10px 16px', width: 130 }}>
        <span
          role="button"
          tabIndex={0}
          onClick={() => onCategoryClick(video.category)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCategoryClick(video.category) }}
          title={`Filtrar por: ${video.category}`}
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontFamily: FONT,
            fontWeight: 500,
            letterSpacing: '0.02em',
            background: catStyle.background,
            color: catStyle.color,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            outline: activeCategory === video.category ? `2px solid ${catStyle.color}` : undefined,
            outlineOffset: activeCategory === video.category ? 1 : undefined,
            transition: 'outline 0.12s',
          }}
        >
          {video.category}
        </span>
      </td>

      {/* Vimeo ID */}
      <td style={{ padding: '10px 16px', width: 100 }}>
        <span
          style={{
            fontSize: 12,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            color: 'var(--dash-text-tertiary)',
          }}
        >
          {video.category === 'fotografia'
            ? 'imagen'
            : video.vimeo_id.length > 12
              ? `${video.vimeo_id.slice(0, 12)}...`
              : video.vimeo_id}
        </span>
      </td>

      {/* Visibility toggle */}
      <td style={{ padding: '10px 16px', textAlign: 'center', width: 80 }}>
        <button
          type="button"
          onClick={() => onToggleVisibility(video)}
          disabled={togglingId === video.id || isPending}
          title={video.is_visible ? 'Ocultar video' : 'Mostrar video'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            color: video.is_visible ? 'var(--dash-text-secondary)' : 'var(--dash-text-tertiary)',
            cursor: togglingId === video.id || isPending ? 'not-allowed' : 'pointer',
            opacity: togglingId === video.id || isPending ? 0.4 : 1,
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--dash-surface-3)'
            e.currentTarget.style.color = 'var(--dash-text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = video.is_visible ? 'var(--dash-text-secondary)' : 'var(--dash-text-tertiary)'
          }}
        >
          {video.is_visible ? (
            <Eye size={14} strokeWidth={1.5} />
          ) : (
            <EyeOff size={14} strokeWidth={1.5} />
          )}
        </button>
      </td>

      {/* Actions: preview + edit + delete */}
      <td style={{ padding: '10px 16px', width: 130 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.15s',
          }}
        >
          {/* Preview — only for non-photo categories */}
          {video.category !== 'fotografia' && (
            <button
              type="button"
              onClick={() => onPreview(video)}
              title="Ver preview de Vimeo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'var(--dash-text-secondary)',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,113,227,0.15)'
                e.currentTarget.style.color = '#0A84FF'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--dash-text-secondary)'
              }}
            >
              <Play size={13} strokeWidth={1.5} />
            </button>
          )}

          {/* Edit */}
          <button
            type="button"
            onClick={() => onEdit(video)}
            title="Editar video"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--dash-text-secondary)',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--dash-surface-3)'
              e.currentTarget.style.color = 'var(--dash-text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--dash-text-secondary)'
            }}
          >
            <Pencil size={13} strokeWidth={1.5} />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(video)}
            disabled={deletingId === video.id || isPending}
            title="Eliminar video"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--dash-text-secondary)',
              cursor: deletingId === video.id || isPending ? 'not-allowed' : 'pointer',
              opacity: deletingId === video.id || isPending ? 0.4 : 1,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!(deletingId === video.id || isPending)) {
                e.currentTarget.style.background = 'rgba(255,69,58,0.15)'
                e.currentTarget.style.color = '#FF453A'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--dash-text-secondary)'
            }}
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── main component ────────────────────────────────────────────────────────

export default function VideoManager({ initialVideos = [], initialCategories }: VideoManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localVideos, setLocalVideos] = useState<PortfolioVideo[]>(initialVideos)

  // Sync local state when server refreshes with new data
  const prevInitialRef = React.useRef(initialVideos)
  React.useEffect(() => {
    if (prevInitialRef.current !== initialVideos) {
      prevInitialRef.current = initialVideos
      setLocalVideos(initialVideos)
    }
  }, [initialVideos])

  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editingVideo, setEditingVideo] = useState<PortfolioVideo | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('todos')
  const [formError, setFormError] = useState<string | null>(null)

  // Cover upload
  const [formCoverUrl, setFormCoverUrl] = useState('')
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverDropOver, setCoverDropOver] = useState(false)
  const coverFileRef = useRef<HTMLInputElement>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkPending, setBulkPending] = useState(false)

  // Preview modal
  const [previewVideo, setPreviewVideo] = useState<PortfolioVideo | null>(null)

  const [formCategory, setFormCategory] = useState<string>('videoclips')
  const [formVimeoId, setFormVimeoId] = useState<string>('')
  const [formPreviewVimeoId, setFormPreviewVimeoId] = useState<string>('')
  const isPhoto = formCategory === 'fotografia'

  // Resolved category list: use initialCategories if provided and non-empty, else fall back to CATEGORIES
  const resolvedCategories =
    initialCategories && initialCategories.length > 0
      ? initialCategories.map((c) => ({ value: c.slug, label: c.label }))
      : CATEGORIES

  const sortedVideos = [...localVideos].sort((a, b) => a.sort_order - b.sort_order)

  const filteredVideos =
    activeFilter === 'todos'
      ? sortedVideos
      : sortedVideos.filter((v) => v.category === activeFilter)

  // Build unique category list from current videos for filter pills
  const uniqueCategories = Array.from(new Set(sortedVideos.map((v) => v.category)))

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ── form helpers ──────────────────────────────────────────────────────────

  async function uploadVideoCover(file: File) {
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `video-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    setCoverUploading(true)
    try {
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false })
      if (error) throw new Error(error.message)
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`
      setFormCoverUrl(url)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al subir miniatura')
    } finally {
      setCoverUploading(false)
    }
  }

  function openCreateForm() {
    setEditingVideo(null)
    setFormMode('create')
    setFormCategory('videoclips')
    setFormVimeoId('')
    setFormPreviewVimeoId('')
    setFormCoverUrl('')
    setShowForm(true)
  }

  function openEditForm(video: PortfolioVideo) {
    setEditingVideo(video)
    setFormMode('edit')
    setFormCategory(video.category)
    setFormVimeoId(video.vimeo_id)
    setFormPreviewVimeoId('')
    setFormCoverUrl(video.cover_url ?? '')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingVideo(null)
    setFormError(null)
    setFormCoverUrl('')
  }

  function resetFormState() {
    setFormCategory('videoclips')
    setFormVimeoId('')
    setFormCoverUrl('')
    setFormPreviewVimeoId('')
    setEditingVideo(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    // Garantizar que cover_url refleja el estado React (no el DOM del input hidden)
    formData.set('cover_url', formCoverUrl)
    setFormError(null)

    startTransition(async () => {
      try {
        if (formMode === 'create') {
          await createPortfolioVideo(formData)
        } else if (editingVideo) {
          await updatePortfolioVideo(editingVideo.id, formData)
        }
        closeForm()
        resetFormState()
        router.refresh()
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
  }

  // ── delete ────────────────────────────────────────────────────────────────

  function handleDelete(video: PortfolioVideo) {
    if (!window.confirm(`Eliminar "${video.title}"? Esta accion no se puede deshacer.`)) return
    setDeletingId(video.id)
    startTransition(async () => {
      try {
        const supabase = createClient()
        const { error } = await supabase.from('portfolio_videos').delete().eq('id', video.id)
        if (error) throw new Error(error.message)
        router.refresh()
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Error al eliminar')
      } finally {
        setDeletingId(null)
      }
    })
  }

  // ── single visibility toggle (optimistic) ────────────────────────────────

  function handleToggleVisibility(video: PortfolioVideo) {
    const next = !video.is_visible
    setLocalVideos((prev) => prev.map((v) => v.id === video.id ? { ...v, is_visible: next } : v))
    setTogglingId(video.id)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('portfolio_videos')
        .update({ is_visible: next })
        .eq('id', video.id)
      if (error) {
        setLocalVideos((prev) => prev.map((v) => v.id === video.id ? { ...v, is_visible: video.is_visible } : v))
      }
      setTogglingId(null)
      router.refresh()
    })
  }

  // ── bulk visibility ───────────────────────────────────────────────────────

  async function handleBulkVisibility(visible: boolean) {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const snapshot = localVideos
    setLocalVideos((prev) =>
      prev.map((v) => selectedIds.has(v.id) ? { ...v, is_visible: visible } : v)
    )
    setBulkPending(true)
    try {
      const supabase = createClient()
      await supabase
        .from('portfolio_videos')
        .update({ is_visible: visible })
        .in('id', ids)
    } catch {
      setLocalVideos(snapshot)
    } finally {
      setBulkPending(false)
      setSelectedIds(new Set())
      router.refresh()
    }
  }

  function handleCheckVideo(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleCheckAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(filteredVideos.map((v) => v.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const allFilteredChecked =
    filteredVideos.length > 0 && filteredVideos.every((v) => selectedIds.has(v.id))
  const someFilteredChecked =
    filteredVideos.some((v) => selectedIds.has(v.id)) && !allFilteredChecked

  // ── drag-to-reorder ────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      setLocalVideos((prev) => {
        // Sort the full list
        const allSorted = [...prev].sort((a, b) => a.sort_order - b.sort_order)

        // Work out the positions of the two items within the full sorted list
        const fromIdx = allSorted.findIndex((v) => v.id === active.id)
        const toIdx   = allSorted.findIndex((v) => v.id === over.id)
        if (fromIdx === -1 || toIdx === -1) return prev

        // Move within the full sorted list
        const reordered = arrayMove(allSorted, fromIdx, toIdx)

        // Re-assign sequential sort_order values
        const updated = reordered.map((v, i) => ({ ...v, sort_order: i + 1 }))

        // Persist to Supabase (fire-and-forget, refresh on complete)
        const supabase = createClient()
        Promise.all(
          updated.map((v) =>
            supabase
              .from('portfolio_videos')
              .update({ sort_order: v.sort_order })
              .eq('id', v.id)
          )
        )
          .then(() => router.refresh())
          .catch(() => router.refresh())

        return updated
      })
    },
    [router],
  )

  // ── category click-to-filter ──────────────────────────────────────────────

  function handleCategoryClick(category: string) {
    setActiveFilter((prev) => (prev === category ? 'todos' : category))
  }

  // ── preview modal ─────────────────────────────────────────────────────────

  function handlePreview(video: PortfolioVideo) {
    setPreviewVideo(video)
  }

  function closePreview() {
    setPreviewVideo(null)
  }

  React.useEffect(() => {
    if (!previewVideo) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePreview()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewVideo])

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>

      {/* ── Vimeo preview modal ──────────────────────────────────────────── */}
      {previewVideo && (
        <VimeoModal
          vimeoId={extractVimeoId(previewVideo.vimeo_id)}
          title={previewVideo.title}
          onClose={closePreview}
        />
      )}

      {/* ── Bulk action floating bar ─────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            backgroundColor: 'var(--dash-surface-2)',
            border: '1px solid var(--dash-border-strong)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(16px)',
            fontFamily: FONT,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--dash-text-secondary)', whiteSpace: 'nowrap' }}>
            {selectedIds.size} {selectedIds.size === 1 ? 'seleccionado' : 'seleccionados'}
          </span>
          <div style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
          <button
            type="button"
            disabled={bulkPending}
            onClick={() => { void handleBulkVisibility(true) }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              backgroundColor: 'rgba(48,209,88,0.15)',
              border: '1px solid rgba(48,209,88,0.3)',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: FONT,
              fontWeight: 500,
              color: '#30D158',
              cursor: bulkPending ? 'not-allowed' : 'pointer',
              opacity: bulkPending ? 0.5 : 1,
              transition: 'opacity 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            <Eye size={13} strokeWidth={1.5} />
            Mostrar seleccionados
          </button>
          <button
            type="button"
            disabled={bulkPending}
            onClick={() => { void handleBulkVisibility(false) }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              backgroundColor: 'rgba(255,69,58,0.12)',
              border: '1px solid rgba(255,69,58,0.3)',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: FONT,
              fontWeight: 500,
              color: '#FF453A',
              cursor: bulkPending ? 'not-allowed' : 'pointer',
              opacity: bulkPending ? 0.5 : 1,
              transition: 'opacity 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            <EyeOff size={13} strokeWidth={1.5} />
            Ocultar seleccionados
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            aria-label="Deseleccionar todos"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: 'none',
              background: 'transparent',
              color: 'var(--dash-text-tertiary)',
              cursor: 'pointer',
              borderRadius: 6,
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--dash-text-tertiary)' }}>
          {localVideos.length} {localVideos.length === 1 ? 'video' : 'videos'}
        </span>

        <button
          type="button"
          onClick={openCreateForm}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            backgroundColor: '#0071E3',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: FONT,
            fontWeight: 500,
            color: '#FFFFFF',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0077ED' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0071E3' }}
        >
          <Plus size={14} strokeWidth={2} />
          Agregar video
        </button>
      </div>

      {/* ── Category filter pills ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* "Todos" pill */}
        {((): React.ReactNode => {
          const active = activeFilter === 'todos'
          return (
            <button
              key="todos"
              type="button"
              onClick={() => setActiveFilter('todos')}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: 'none',
                fontSize: 13,
                fontFamily: FONT,
                fontWeight: active ? 500 : 400,
                backgroundColor: active ? '#0071E3' : 'var(--dash-surface-2)',
                color: active ? '#FFFFFF' : 'var(--dash-text-secondary)',
                cursor: 'pointer',
                transition: 'background-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'var(--dash-surface-3)'
                  e.currentTarget.style.color = 'var(--dash-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'var(--dash-surface-2)'
                  e.currentTarget.style.color = 'var(--dash-text-secondary)'
                }
              }}
            >
              Todos
            </button>
          )
        })()}

        {/* Dynamic per-category pills derived from actual video data */}
        {uniqueCategories.map((cat) => {
          const active = activeFilter === cat
          const catStyle = CATEGORY_STYLES[cat] ?? DEFAULT_CATEGORY_STYLE
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveFilter(active ? 'todos' : cat)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: 'none',
                fontSize: 13,
                fontFamily: FONT,
                fontWeight: active ? 500 : 400,
                backgroundColor: active ? catStyle.color : 'var(--dash-surface-2)',
                color: active ? '#FFFFFF' : 'var(--dash-text-secondary)',
                cursor: 'pointer',
                transition: 'background-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'var(--dash-surface-3)'
                  e.currentTarget.style.color = 'var(--dash-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'var(--dash-surface-2)'
                  e.currentTarget.style.color = 'var(--dash-text-secondary)'
                }
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* ── Inline form panel ────────────────────────────────────────────── */}
      {showForm && (
        <div
          style={{
            backgroundColor: 'var(--dash-surface-2)',
            border: '1px solid var(--dash-border)',
            borderRadius: 16,
            padding: 24,
          }}
        >
          {/* Form header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 13,
                fontFamily: FONT,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--dash-text-secondary)',
              }}
            >
              {formMode === 'create' ? 'Nuevo video' : 'Editar video'}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'var(--dash-text-tertiary)',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--dash-surface-3)'
                e.currentTarget.style.color = 'var(--dash-text-secondary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--dash-text-tertiary)'
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Row 1: Titulo + Vimeo ID / URL imagen */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="title" style={LABEL_STYLE}>{isPhoto ? 'Título de la foto *' : 'Titulo del video *'}</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  defaultValue={editingVideo?.title ?? ''}
                  placeholder={isPhoto ? 'Nombre de la foto' : 'Nombre del video'}
                  style={INPUT_STYLE}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#0071E3' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dash-border)' }}
                />
              </div>
              <div>
                <label htmlFor="vimeo_id" style={LABEL_STYLE}>
                  {isPhoto ? 'URL de imagen *' : 'ID de Vimeo *'}
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    id="vimeo_id"
                    name="vimeo_id"
                    type={isPhoto ? 'url' : 'text'}
                    required
                    value={formVimeoId}
                    onChange={(e) => {
                      setFormVimeoId(e.target.value)
                      setFormPreviewVimeoId('')
                    }}
                    placeholder={isPhoto ? 'https://...' : '123456789'}
                    style={INPUT_STYLE}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#0071E3' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dash-border)' }}
                  />
                  {!isPhoto && formVimeoId && (
                    <button
                      type="button"
                      onClick={() => setFormPreviewVimeoId(extractVimeoId(formVimeoId))}
                      style={{
                        flexShrink: 0,
                        padding: '8px 12px',
                        backgroundColor: 'var(--dash-surface-3)',
                        border: '1px solid var(--dash-border)',
                        borderRadius: 8,
                        fontSize: 12,
                        fontFamily: FONT,
                        color: 'var(--dash-text-secondary)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'background-color 0.15s, color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--dash-surface-3)'
                        e.currentTarget.style.color = 'var(--dash-text-primary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--dash-surface-3)'
                        e.currentTarget.style.color = 'var(--dash-text-secondary)'
                      }}
                    >
                      Ver preview
                    </button>
                  )}
                </div>
                {!isPhoto && formPreviewVimeoId && (
                  <div style={{ marginTop: 10 }}>
                    <iframe
                      src={`https://player.vimeo.com/video/${formPreviewVimeoId}`}
                      width={400}
                      height={225}
                      allow="autoplay; fullscreen; picture-in-picture"
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        display: 'block',
                        backgroundColor: 'var(--dash-bg)',
                      }}
                      title="Vimeo preview"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Cover — drag-and-drop upload o URL (para videos y fotos) */}
            <div>
              <label style={LABEL_STYLE}>
                {isPhoto ? 'Imagen de portada' : 'Miniatura personalizada'}
                {!isPhoto && <span style={{ color: 'var(--dash-text-tertiary)', marginLeft: 4 }}>(opcional — usa Vimeo si vacío)</span>}
              </label>
              <input name="cover_url" type="hidden" value={formCoverUrl} onChange={() => {}} />
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {/* Drop zone / preview */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setCoverDropOver(true) }}
                  onDragLeave={() => setCoverDropOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setCoverDropOver(false)
                    const file = e.dataTransfer.files[0]
                    if (file && (file.type.startsWith('image/') || file.type === 'image/gif')) uploadVideoCover(file)
                  }}
                  onClick={() => !coverUploading && coverFileRef.current?.click()}
                  style={{
                    width: 90,
                    height: 64,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: 'var(--dash-surface-2)',
                    border: `1.5px dashed ${coverDropOver ? 'rgba(255,255,255,0.4)' : formCoverUrl ? 'transparent' : 'rgba(255,255,255,0.15)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: coverUploading ? 'wait' : 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'border-color 0.15s',
                    gap: 3,
                  }}
                >
                  {formCoverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formCoverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  ) : coverUploading ? (
                    <span style={{ fontSize: 10, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>Subiendo…</span>
                  ) : (
                    <>
                      <Upload size={14} strokeWidth={1.5} color="rgba(255,255,255,0.25)" />
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: FONT, textAlign: 'center', lineHeight: 1.3 }}>
                        Subir o<br />arrastrar
                      </span>
                    </>
                  )}
                </div>
                <input
                  ref={coverFileRef}
                  type="file"
                  accept="image/*,image/gif"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadVideoCover(file)
                    e.target.value = ''
                  }}
                />
                {/* URL paste input */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    type="url"
                    value={formCoverUrl}
                    onChange={(e) => setFormCoverUrl(e.target.value)}
                    placeholder="O pega una URL de imagen / GIF..."
                    style={{ ...INPUT_STYLE }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#0071E3' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dash-border)' }}
                  />
                  {formCoverUrl && (
                    <button
                      type="button"
                      onClick={() => setFormCoverUrl('')}
                      style={{ alignSelf: 'flex-start', fontSize: 11, color: '#FF453A', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: FONT }}
                    >
                      Quitar miniatura
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Categoria + Cliente + Ano */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="category" style={LABEL_STYLE}>Categoria</label>
                <select
                  id="category"
                  name="category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={{ ...INPUT_STYLE, appearance: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#0071E3' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dash-border)' }}
                >
                  {resolvedCategories.map((c) => (
                    <option key={c.value} value={c.value} style={{ backgroundColor: 'var(--dash-surface-2)' }}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="client_name" style={LABEL_STYLE}>Cliente</label>
                <input
                  id="client_name"
                  name="client_name"
                  type="text"
                  defaultValue={editingVideo?.client_name ?? ''}
                  placeholder="Nombre del cliente"
                  style={INPUT_STYLE}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#0071E3' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dash-border)' }}
                />
              </div>
              <div>
                <label htmlFor="year" style={LABEL_STYLE}>Ano</label>
                <input
                  id="year"
                  name="year"
                  type="text"
                  defaultValue={editingVideo?.year ?? ''}
                  placeholder="2024"
                  style={INPUT_STYLE}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#0071E3' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dash-border)' }}
                />
              </div>
            </div>

            {/* Row 3: Rol + Orden */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="role" style={LABEL_STYLE}>Rol</label>
                <input
                  id="role"
                  name="role"
                  type="text"
                  defaultValue={editingVideo?.role ?? ''}
                  placeholder="Director, editor..."
                  style={INPUT_STYLE}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#0071E3' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dash-border)' }}
                />
              </div>
              <div>
                <label htmlFor="sort_order" style={LABEL_STYLE}>Orden</label>
                <input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  defaultValue={editingVideo?.sort_order ?? 0}
                  placeholder="0"
                  style={INPUT_STYLE}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#0071E3' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dash-border)' }}
                />
              </div>
            </div>

            {/* Descripcion */}
            <div>
              <label htmlFor="description" style={LABEL_STYLE}>Descripcion</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={editingVideo?.description ?? ''}
                placeholder="Descripcion del video..."
                style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: 1.5 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#0071E3' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dash-border)' }}
              />
            </div>

            {/* Visible checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                id="is_visible"
                name="is_visible"
                type="checkbox"
                defaultChecked={editingVideo ? editingVideo.is_visible : true}
                style={{ accentColor: '#0071E3', width: 14, height: 14 }}
              />
              <label
                htmlFor="is_visible"
                style={{ fontSize: 13, fontFamily: FONT, color: 'var(--dash-text-secondary)', cursor: 'pointer' }}
              >
                Visible en el portfolio publico
              </label>
            </div>

            {/* Form actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
              <button
                type="submit"
                disabled={isPending}
                style={{
                  padding: '9px 20px',
                  backgroundColor: '#0071E3',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: FONT,
                  fontWeight: 500,
                  color: '#FFFFFF',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.5 : 1,
                  transition: 'background-color 0.15s, opacity 0.15s',
                }}
                onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = '#0077ED' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0071E3' }}
              >
                {isPending
                  ? 'Guardando...'
                  : formMode === 'create'
                    ? 'Crear video'
                    : 'Guardar cambios'}
              </button>

              <button
                type="button"
                onClick={closeForm}
                disabled={isPending}
                style={{
                  padding: '9px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: 14,
                  fontFamily: FONT,
                  color: 'var(--dash-text-tertiary)',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.4 : 1,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--dash-text-secondary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--dash-text-tertiary)' }}
              >
                Cancelar
              </button>
            </div>
            {formError && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#FF453A' }}>{formError}</p>
            )}
          </form>
        </div>
      )}

      {/* ── Video table ──────────────────────────────────────────────────── */}
      {filteredVideos.length === 0 ? (
        <div
          style={{
            border: '1px solid var(--dash-border)',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 14, fontFamily: FONT, color: 'var(--dash-text-tertiary)' }}>
            No hay videos todavia
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, fontFamily: FONT, color: 'var(--dash-text-tertiary)' }}>
            Usa el boton &quot;Agregar video&quot; para empezar
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredVideos.map((v) => v.id)}
            strategy={verticalListSortingStrategy}
          >
            <div
              style={{
                backgroundColor: 'var(--dash-surface-1)',
                border: '1px solid var(--dash-border)',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--dash-border)' }}>
                    {/* Select all */}
                    <th style={{ padding: '12px 8px 12px 16px', width: 36 }}>
                      <input
                        type="checkbox"
                        checked={allFilteredChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = someFilteredChecked
                        }}
                        onChange={(e) => handleCheckAll(e.target.checked)}
                        style={{ accentColor: '#0071E3', width: 14, height: 14, cursor: 'pointer' }}
                        aria-label="Seleccionar todos"
                      />
                    </th>
                    {/* Drag handle + order */}
                    <th style={{ width: 52 }} />
                    {/* Thumb / title */}
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontFamily: FONT,
                        fontWeight: 500,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: 'var(--dash-text-tertiary)',
                      }}
                    >
                      Video
                    </th>
                    {/* Categoria */}
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontFamily: FONT,
                        fontWeight: 500,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: 'var(--dash-text-tertiary)',
                        width: 130,
                      }}
                    >
                      Categoria
                    </th>
                    {/* Vimeo ID */}
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontFamily: FONT,
                        fontWeight: 500,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: 'var(--dash-text-tertiary)',
                        width: 100,
                      }}
                    >
                      Vimeo ID
                    </th>
                    {/* Visible */}
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        fontSize: 11,
                        fontFamily: FONT,
                        fontWeight: 500,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: 'var(--dash-text-tertiary)',
                        width: 80,
                      }}
                    >
                      Visible
                    </th>
                    {/* Actions */}
                    <th style={{ width: 130 }} />
                  </tr>
                </thead>
                <tbody>
                  {filteredVideos.map((video, idx) => (
                    <SortableRow
                      key={video.id}
                      video={video}
                      displayOrder={idx + 1}
                      isChecked={selectedIds.has(video.id)}
                      isDraggingDisabled={isPending}
                      onCheck={handleCheckVideo}
                      onToggleVisibility={handleToggleVisibility}
                      onEdit={openEditForm}
                      onDelete={handleDelete}
                      onPreview={handlePreview}
                      onCategoryClick={handleCategoryClick}
                      activeCategory={activeFilter}
                      togglingId={togglingId}
                      deletingId={deletingId}
                      isPending={isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
