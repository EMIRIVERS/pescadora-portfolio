'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Eye, EyeOff, X } from 'lucide-react'
import {
  createPortfolioVideo,
  updatePortfolioVideo,
  deletePortfolioVideo,
  togglePortfolioVideoVisibility,
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
  created_at: string
  updated_at: string
}

interface VideoManagerProps {
  initialVideos?: PortfolioVideo[]
  initialCategories?: { id: string; slug: string; label: string }[]
}

type FormMode = 'create' | 'edit'

type CategoryFilter = 'todos' | 'videoclips' | 'corporativos' | 'restaurantes' | 'comerciales' | 'fotografia'

// Apple-style category pill colours (bg + text as inline style objects)
const CATEGORY_STYLES: Record<string, { background: string; color: string }> = {
  videoclips:   { background: 'rgba(191,90,242,0.15)', color: '#BF5AF2' },
  corporativos: { background: 'rgba(0,113,227,0.15)',  color: '#0A84FF' },
  restaurantes: { background: 'rgba(255,159,10,0.15)', color: '#FF9F0A' },
  comerciales:  { background: 'rgba(48,209,88,0.15)',  color: '#30D158' },
  fotografia:   { background: 'rgba(255,69,58,0.15)',  color: '#FF453A' },
}

const DEFAULT_CATEGORY_STYLE: { background: string; color: string } = {
  background: '#2C2C2E',
  color: '#86868B',
}

const CATEGORIES = [
  { value: 'videoclips',   label: 'Videoclips' },
  { value: 'corporativos', label: 'Corporativos' },
  { value: 'restaurantes', label: 'Restaurantes' },
  { value: 'comerciales',  label: 'Comerciales' },
  { value: 'fotografia',   label: 'Fotografía' },
]

const FILTER_PILLS: { value: CategoryFilter; label: string }[] = [
  { value: 'todos',        label: 'Todos' },
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
  backgroundColor: '#1C1C1E',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  color: '#F5F5F7',
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
  color: '#86868B',
  marginBottom: 6,
}

// ─── sub-components ────────────────────────────────────────────────────────

function CategoryPill({ category }: { category: string }) {
  const s = CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontFamily: FONT,
        fontWeight: 500,
        letterSpacing: '0.02em',
        background: s.background,
        color: s.color,
        whiteSpace: 'nowrap',
      }}
    >
      {category}
    </span>
  )
}

interface ReorderButtonProps {
  direction: 'up' | 'down'
  disabled: boolean
  onClick: () => void
  title: string
}

function ReorderButton({ direction, disabled, onClick, title }: ReorderButtonProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: 'none',
        background: hovered && !disabled ? '#3A3A3C' : '#2C2C2E',
        color: disabled ? '#3A3A3C' : '#86868B',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 11,
        lineHeight: 1,
        transition: 'background 0.15s, color 0.15s',
        flexShrink: 0,
      }}
    >
      {direction === 'up' ? '▲' : '▼'}
    </button>
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
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('todos')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const [formCategory, setFormCategory] = useState<string>('videoclips')
  const [formVimeoId, setFormVimeoId] = useState<string>('')
  const [previewVimeoId, setPreviewVimeoId] = useState<string>('')
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

  function openCreateForm() {
    setEditingVideo(null)
    setFormMode('create')
    setFormCategory('videoclips')
    setFormVimeoId('')
    setPreviewVimeoId('')
    setShowForm(true)
  }

  function openEditForm(video: PortfolioVideo) {
    setEditingVideo(video)
    setFormMode('edit')
    setFormCategory(video.category)
    setFormVimeoId(video.vimeo_id)
    setPreviewVimeoId('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingVideo(null)
  }

  function resetFormState() {
    setFormCategory('videoclips')
    setFormVimeoId('')
    setPreviewVimeoId('')
    setEditingVideo(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      if (formMode === 'create') {
        await createPortfolioVideo(formData)
      } else if (editingVideo) {
        await updatePortfolioVideo(editingVideo.id, formData)
      }
      closeForm()
      resetFormState()
      router.refresh()
    })
  }

  function handleDelete(video: PortfolioVideo) {
    if (!window.confirm(`Eliminar "${video.title}"? Esta accion no se puede deshacer.`)) return
    setDeletingId(video.id)
    startTransition(async () => {
      await deletePortfolioVideo(video.id)
      setDeletingId(null)
      router.refresh()
    })
  }

  function handleToggleVisibility(video: PortfolioVideo) {
    setTogglingId(video.id)
    startTransition(async () => {
      await togglePortfolioVideoVisibility(video.id, !video.is_visible)
      setTogglingId(null)
      router.refresh()
    })
  }

  async function reorderVideo(id: string, direction: 'up' | 'down') {
    const sorted = [...localVideos].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex((v) => v.id === id)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const current = sorted[idx]
    const adjacent = sorted[swapIdx]

    const snapshot = localVideos
    setLocalVideos(
      localVideos.map((v) => {
        if (v.id === current.id) return { ...v, sort_order: adjacent.sort_order }
        if (v.id === adjacent.id) return { ...v, sort_order: current.sort_order }
        return v
      }),
    )
    setReorderingId(id)

    try {
      const supabase = createClient()
      await Promise.all([
        supabase
          .from('portfolio_videos')
          .update({ sort_order: adjacent.sort_order })
          .eq('id', current.id),
        supabase
          .from('portfolio_videos')
          .update({ sort_order: current.sort_order })
          .eq('id', adjacent.id),
      ])
    } catch {
      setLocalVideos(snapshot)
    } finally {
      setReorderingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#48484A' }}>
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
        {FILTER_PILLS.map((pill) => {
          const active = activeFilter === pill.value
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => setActiveFilter(pill.value)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: 'none',
                fontSize: 13,
                fontFamily: FONT,
                fontWeight: active ? 500 : 400,
                backgroundColor: active ? '#0071E3' : '#1C1C1E',
                color: active ? '#FFFFFF' : '#86868B',
                cursor: 'pointer',
                transition: 'background-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = '#2C2C2E'
                  e.currentTarget.style.color = '#F5F5F7'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = '#1C1C1E'
                  e.currentTarget.style.color = '#86868B'
                }
              }}
            >
              {pill.label}
            </button>
          )
        })}
      </div>

      {/* ── Inline form panel ────────────────────────────────────────────── */}
      {showForm && (
        <div
          style={{
            backgroundColor: '#1C1C1E',
            border: '1px solid rgba(255,255,255,0.08)',
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
                color: '#86868B',
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
                color: '#48484A',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2C2C2E'
                e.currentTarget.style.color = '#86868B'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#48484A'
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
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
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
                      setPreviewVimeoId('')
                    }}
                    placeholder={isPhoto ? 'https://...' : '123456789'}
                    style={INPUT_STYLE}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#0071E3' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                  />
                  {!isPhoto && formVimeoId && (
                    <button
                      type="button"
                      onClick={() => setPreviewVimeoId(formVimeoId)}
                      style={{
                        flexShrink: 0,
                        padding: '8px 12px',
                        backgroundColor: '#2C2C2E',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        fontSize: 12,
                        fontFamily: FONT,
                        color: '#86868B',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'background-color 0.15s, color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#3A3A3C'
                        e.currentTarget.style.color = '#F5F5F7'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#2C2C2E'
                        e.currentTarget.style.color = '#86868B'
                      }}
                    >
                      Ver preview
                    </button>
                  )}
                </div>
                {!isPhoto && previewVimeoId && (
                  <div style={{ marginTop: 10 }}>
                    <iframe
                      src={`https://player.vimeo.com/video/${previewVimeoId}`}
                      width={400}
                      height={225}
                      allow="autoplay; fullscreen; picture-in-picture"
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        display: 'block',
                        backgroundColor: '#000',
                      }}
                      title="Vimeo preview"
                    />
                  </div>
                )}
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
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                >
                  {resolvedCategories.map((c) => (
                    <option key={c.value} value={c.value} style={{ backgroundColor: '#1C1C1E' }}>
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
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
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
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
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
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
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
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
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
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
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
                style={{ fontSize: 13, fontFamily: FONT, color: '#86868B', cursor: 'pointer' }}
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
                  color: '#48484A',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.4 : 1,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#86868B' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#48484A' }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Video table ──────────────────────────────────────────────────── */}
      {filteredVideos.length === 0 ? (
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 14, fontFamily: FONT, color: '#48484A' }}>
            No hay videos todavia
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, fontFamily: FONT, color: '#3A3A3C' }}>
            Usa el boton &quot;Agregar video&quot; para empezar
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#111111',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
                    color: '#48484A',
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
                    color: '#48484A',
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
                    color: '#48484A',
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
                    color: '#48484A',
                    width: 80,
                  }}
                >
                  Visible
                </th>
                {/* Actions */}
                <th style={{ width: 120 }} />
              </tr>
            </thead>
            <tbody>
              {filteredVideos.map((video, idx) => {
                const isHovered = hoveredRow === video.id
                return (
                  <tr
                    key={video.id}
                    onMouseEnter={() => setHoveredRow(video.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      backgroundColor: isHovered ? '#1C1C1E' : 'transparent',
                      borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                      transition: 'background-color 0.12s',
                    }}
                  >
                    {/* Thumbnail + title */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            video.category === 'fotografia'
                              ? video.vimeo_id
                              : `/api/vimeo-thumb?id=${video.vimeo_id}`
                          }
                          alt={video.title}
                          width={60}
                          height={40}
                          style={{
                            width: 60,
                            height: 40,
                            objectFit: 'cover',
                            borderRadius: 6,
                            backgroundColor: '#2C2C2E',
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
                              color: '#F5F5F7',
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
                                color: '#86868B',
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

                    {/* Category pill */}
                    <td style={{ padding: '12px 16px' }}>
                      <CategoryPill category={video.category} />
                    </td>

                    {/* Vimeo ID */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                          color: '#48484A',
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
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(video)}
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
                          color: video.is_visible ? '#86868B' : '#3A3A3C',
                          cursor: togglingId === video.id || isPending ? 'not-allowed' : 'pointer',
                          opacity: togglingId === video.id || isPending ? 0.4 : 1,
                          transition: 'color 0.15s, background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#2C2C2E'
                          e.currentTarget.style.color = '#F5F5F7'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = video.is_visible ? '#86868B' : '#3A3A3C'
                        }}
                      >
                        {video.is_visible ? (
                          <Eye size={14} strokeWidth={1.5} />
                        ) : (
                          <EyeOff size={14} strokeWidth={1.5} />
                        )}
                      </button>
                    </td>

                    {/* Reorder + Edit + Delete */}
                    <td style={{ padding: '12px 16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          opacity: isHovered ? 1 : 0,
                          transition: 'opacity 0.15s',
                        }}
                      >
                        <ReorderButton
                          direction="up"
                          disabled={idx === 0 || reorderingId === video.id || isPending}
                          onClick={() => reorderVideo(video.id, 'up')}
                          title="Mover arriba"
                        />
                        <ReorderButton
                          direction="down"
                          disabled={
                            idx === filteredVideos.length - 1 ||
                            reorderingId === video.id ||
                            isPending
                          }
                          onClick={() => reorderVideo(video.id, 'down')}
                          title="Mover abajo"
                        />

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => openEditForm(video)}
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
                            color: '#86868B',
                            cursor: 'pointer',
                            transition: 'background 0.15s, color 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#2C2C2E'
                            e.currentTarget.style.color = '#F5F5F7'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = '#86868B'
                          }}
                        >
                          <Pencil size={13} strokeWidth={1.5} />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(video)}
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
                            color: '#86868B',
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
                            e.currentTarget.style.color = '#86868B'
                          }}
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
