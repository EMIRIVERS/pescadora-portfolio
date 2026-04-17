'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Check, ImageIcon } from 'lucide-react'
import {
  createCategory,
  updateCategory,
  updateCategoryCover,
  deleteCategory,
  toggleCategoryVisibility,
  reorderCategories,
} from '@/lib/actions/categories'

interface Category {
  id: string
  slug: string
  label: string
  sort_order: number
  is_visible: boolean
  cover_url?: string | null
}

interface Props {
  initialCategories: Category[]
  videoCounts?: Record<string, number>
}

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

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

export default function CategoryManager({ initialCategories, videoCounts = {} }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cats, setCats] = useState<Category[]>(initialCategories)
  const [showNew, setShowNew] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [editSlugWarning, setEditSlugWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Cover editing state: keyed by category id
  const [coverEditingId, setCoverEditingId] = useState<string | null>(null)
  const [coverDraft, setCoverDraft] = useState('')

  const sorted = [...cats].sort((a, b) => a.sort_order - b.sort_order)

  function generateSlug(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
  }

  function handleNewLabelChange(val: string) {
    setNewLabel(val)
    setNewSlug(generateSlug(val))
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('slug', newSlug)
    fd.set('label', newLabel)
    startTransition(async () => {
      try {
        await createCategory(fd)
        setShowNew(false)
        setNewLabel('')
        setNewSlug('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al crear')
      }
    })
  }

  function handleEdit(cat: Category) {
    setEditingId(cat.id)
    setEditLabel(cat.label)
    setEditSlugWarning(null)
    setError(null)
  }

  function handleSaveEdit(cat: Category) {
    const trimmed = editLabel.trim()
    if (!trimmed) return
    const newSlugVal = generateSlug(trimmed)
    const slugChanged = newSlugVal !== cat.slug
    startTransition(async () => {
      try {
        const result = await updateCategory(cat.slug, {
          label: trimmed,
          ...(slugChanged ? { slug: newSlugVal } : {}),
        })
        if (result.error) {
          setError(result.error)
          return
        }
        setCats((prev) =>
          prev.map((c) =>
            c.id === cat.id
              ? { ...c, label: trimmed, ...(slugChanged ? { slug: newSlugVal } : {}) }
              : c
          )
        )
        setEditingId(null)
        setEditSlugWarning(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
  }

  function handleEditLabelChange(val: string, cat: Category) {
    setEditLabel(val)
    const newSlugVal = generateSlug(val.trim())
    if (newSlugVal && newSlugVal !== cat.slug) {
      setEditSlugWarning(`El slug cambiara de '${cat.slug}' a '${newSlugVal}'. Los videos se actualizaran automaticamente.`)
    } else {
      setEditSlugWarning(null)
    }
  }

  function handleDelete(cat: Category) {
    if (!window.confirm(`Eliminar categoría "${cat.label}"? Los videos de esta categoría quedarán sin categoría.`)) return
    startTransition(async () => {
      try {
        await deleteCategory(cat.id)
        setCats((prev) => prev.filter((c) => c.id !== cat.id))
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar')
      }
    })
  }

  function handleToggle(cat: Category) {
    const next = !cat.is_visible
    setCats((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_visible: next } : c))
    startTransition(async () => {
      try {
        await toggleCategoryVisibility(cat.id, next)
        router.refresh()
      } catch {
        setCats((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_visible: cat.is_visible } : c))
      }
    })
  }

  function handleReorder(cat: Category, dir: 'up' | 'down') {
    const idx = sorted.findIndex((c) => c.id === cat.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const adj = sorted[swapIdx]
    const snapshot = cats
    setCats((prev) => prev.map((c) => {
      if (c.id === cat.id) return { ...c, sort_order: adj.sort_order }
      if (c.id === adj.id) return { ...c, sort_order: cat.sort_order }
      return c
    }))
    setReorderingId(cat.id)
    startTransition(async () => {
      try {
        await reorderCategories(cat.id, adj.id, cat.sort_order, adj.sort_order)
        router.refresh()
      } catch {
        setCats(snapshot)
      } finally {
        setReorderingId(null)
      }
    })
  }

  function handleOpenCoverEdit(cat: Category) {
    setCoverEditingId(cat.id)
    setCoverDraft(cat.cover_url ?? '')
    setEditingId(null)
    setError(null)
  }

  function handleSaveCover(cat: Category) {
    const url = coverDraft.trim() || null
    startTransition(async () => {
      try {
        await updateCategoryCover(cat.slug, url)
        setCats((prev) => prev.map((c) => c.id === cat.id ? { ...c, cover_url: url } : c))
        setCoverEditingId(null)
        setCoverDraft('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar miniatura')
      }
    })
  }

  function handleCancelCover() {
    setCoverEditingId(null)
    setCoverDraft('')
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`
        .cm-row { transition: background 0.12s; }
        .cm-row:hover { background: rgba(255,255,255,0.03) !important; }
        .cm-btn { transition: background 0.12s, color 0.12s; }
        .cm-btn:hover { background: var(--dash-surface-3) !important; color: var(--dash-text-primary) !important; }
        .cm-del:hover { background: rgba(255,69,58,0.15) !important; color: #FF453A !important; }
        .cm-cover-input:focus { border-color: rgba(255,255,255,0.25) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dash-text-secondary)' }}>
            Categorías del portfolio
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--dash-text-tertiary)' }}>
            Arrastra para reordenar — el orden se refleja en el sitio público
          </p>
        </div>
        <button
          onClick={() => { setShowNew(true); setError(null) }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', borderRadius: 8, fontSize: 13, color: 'var(--dash-text-primary)', cursor: 'pointer', fontFamily: FONT }}
        >
          <Plus size={13} strokeWidth={2} />
          Nueva categoría
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: '#FF453A', marginBottom: 12 }}>{error}</p>
      )}

      {/* New category form */}
      {showNew && (
        <form
          onSubmit={handleCreate}
          style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: 12, background: 'var(--dash-surface-2)', borderRadius: 10, border: '1px solid var(--dash-border)' }}
        >
          <div style={{ flex: 1 }}>
            <input
              value={newLabel}
              onChange={(e) => handleNewLabelChange(e.target.value)}
              placeholder="Nombre (ej. Musicales)"
              required
              autoFocus
              style={{ ...INPUT, width: '100%' }}
            />
            {newSlug && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--dash-text-tertiary)' }}>slug: {newSlug}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isPending || !newLabel.trim()}
            style={{ padding: '8px 16px', background: '#0071E3', border: 'none', borderRadius: 8, fontSize: 13, color: '#fff', cursor: 'pointer', opacity: isPending ? 0.5 : 1, fontFamily: FONT }}
          >
            {isPending ? '...' : 'Crear'}
          </button>
          <button
            type="button"
            onClick={() => { setShowNew(false); setNewLabel(''); setNewSlug('') }}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'transparent', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', borderRadius: 6 }}
          >
            <X size={14} />
          </button>
        </form>
      )}

      {/* Category list */}
      <div style={{ background: 'var(--dash-surface-1)', border: '1px solid var(--dash-border)', borderRadius: 12, overflow: 'hidden' }}>
        {sorted.map((cat, idx) => (
          <div key={cat.id}>
            {/* Main row */}
            <div
              className="cm-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderBottom: (idx < sorted.length - 1 && coverEditingId !== cat.id)
                  ? '1px solid var(--dash-surface-2)'
                  : undefined,
                opacity: cat.is_visible ? 1 : 0.45,
              }}
            >
              {/* Up/Down */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  className="cm-btn"
                  onClick={() => handleReorder(cat, 'up')}
                  disabled={idx === 0 || isPending || reorderingId === cat.id}
                  style={{ width: 20, height: 20, background: 'transparent', border: 'none', color: idx === 0 ? 'var(--dash-surface-3)' : 'var(--dash-text-tertiary)', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 9, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >▲</button>
                <button
                  className="cm-btn"
                  onClick={() => handleReorder(cat, 'down')}
                  disabled={idx === sorted.length - 1 || isPending || reorderingId === cat.id}
                  style={{ width: 20, height: 20, background: 'transparent', border: 'none', color: idx === sorted.length - 1 ? 'var(--dash-surface-3)' : 'var(--dash-text-tertiary)', cursor: idx === sorted.length - 1 ? 'not-allowed' : 'pointer', fontSize: 9, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >▼</button>
              </div>

              {/* Cover thumbnail preview */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'var(--dash-surface-2)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {cat.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cat.cover_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <ImageIcon size={14} strokeWidth={1.5} color="#3A3A3C" />
                )}
              </div>

              {/* Label / edit */}
              <div style={{ flex: 1 }}>
                {editingId === cat.id ? (
                  <div>
                    <input
                      value={editLabel}
                      onChange={(e) => handleEditLabelChange(e.target.value, cat)}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(cat); if (e.key === 'Escape') { setEditingId(null); setEditSlugWarning(null) } }}
                      style={{ ...INPUT, padding: '5px 10px', fontSize: 13, width: '100%' }}
                    />
                    {editSlugWarning && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#FF9F0A', lineHeight: 1.4 }}>
                        {editSlugWarning}
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dash-text-primary)' }}>{cat.label}</span>
                    {/* Tipo: Foto vs Video */}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: cat.slug === 'fotografia' ? '#BF5AF2' : '#0071E3',
                        backgroundColor: cat.slug === 'fotografia' ? 'rgba(191,90,242,0.12)' : 'rgba(0,113,227,0.12)',
                        borderRadius: 20,
                        padding: '1px 8px',
                        lineHeight: '18px',
                        flexShrink: 0,
                      }}
                    >
                      {cat.slug === 'fotografia' ? 'Foto' : 'Video'}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--dash-text-secondary)',
                        backgroundColor: 'var(--dash-border)',
                        borderRadius: 20,
                        padding: '1px 8px',
                        lineHeight: '18px',
                        flexShrink: 0,
                      }}
                    >
                      {videoCounts[cat.slug] ?? 0} {(videoCounts[cat.slug] ?? 0) === 1 ? 'video' : 'videos'}
                    </span>
                    {cat.cover_url && (
                      <span
                        style={{
                          fontSize: 10,
                          color: '#30D158',
                          backgroundColor: 'rgba(48,209,88,0.1)',
                          borderRadius: 20,
                          padding: '1px 8px',
                          lineHeight: '18px',
                          flexShrink: 0,
                          letterSpacing: '0.03em',
                        }}
                      >
                        cover manual
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {editingId === cat.id ? (
                  <>
                    <button
                      className="cm-btn"
                      onClick={() => handleSaveEdit(cat)}
                      disabled={isPending}
                      style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: '#30D158', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Check size={13} strokeWidth={2.5} />
                    </button>
                    <button
                      className="cm-btn"
                      onClick={() => setEditingId(null)}
                      style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: 'var(--dash-text-tertiary)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={13} strokeWidth={2} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="cm-btn"
                      onClick={() => handleToggle(cat)}
                      disabled={isPending}
                      title={cat.is_visible ? 'Ocultar' : 'Mostrar'}
                      style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: cat.is_visible ? 'var(--dash-text-secondary)' : '#3A3A3C', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {cat.is_visible ? <Eye size={13} strokeWidth={1.5} /> : <EyeOff size={13} strokeWidth={1.5} />}
                    </button>
                    <button
                      className="cm-btn"
                      onClick={() => handleOpenCoverEdit(cat)}
                      title="Cambiar miniatura"
                      style={{ width: 28, height: 28, background: coverEditingId === cat.id ? 'var(--dash-surface-3)' : 'transparent', border: 'none', color: cat.cover_url ? '#30D158' : 'var(--dash-text-secondary)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <ImageIcon size={13} strokeWidth={1.5} />
                    </button>
                    <button
                      className="cm-btn"
                      onClick={() => handleEdit(cat)}
                      title="Renombrar"
                      style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: 'var(--dash-text-secondary)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Pencil size={13} strokeWidth={1.5} />
                    </button>
                    <button
                      className="cm-btn cm-del"
                      onClick={() => handleDelete(cat)}
                      disabled={isPending}
                      title="Eliminar categoría"
                      style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: 'var(--dash-text-secondary)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Cover edit panel — inline below the row */}
            {coverEditingId === cat.id && (
              <div
                style={{
                  padding: '12px 16px 16px',
                  background: '#161616',
                  borderBottom: idx < sorted.length - 1 ? '1px solid var(--dash-surface-2)' : undefined,
                  borderTop: '1px solid var(--dash-border)',
                }}
              >
                <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--dash-text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Miniatura de portada — {cat.label}
                </p>

                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {/* Preview */}
                  <div
                    style={{
                      width: 72,
                      height: 48,
                      borderRadius: 6,
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: 'var(--dash-surface-2)',
                      border: '1px solid var(--dash-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {coverDraft.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverDraft.trim()}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <ImageIcon size={18} strokeWidth={1.2} color="#3A3A3C" />
                    )}
                  </div>

                  {/* Input + actions */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      className="cm-cover-input"
                      value={coverDraft}
                      onChange={(e) => setCoverDraft(e.target.value)}
                      placeholder="https://... pega la URL de la imagen"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCover(cat)
                        if (e.key === 'Escape') handleCancelCover()
                      }}
                      style={{
                        ...INPUT,
                        width: '100%',
                        fontSize: 12,
                        padding: '7px 10px',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        onClick={() => handleSaveCover(cat)}
                        disabled={isPending}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '6px 14px', background: '#0071E3', border: 'none',
                          borderRadius: 7, fontSize: 12, color: '#fff', cursor: 'pointer',
                          opacity: isPending ? 0.5 : 1, fontFamily: FONT,
                        }}
                      >
                        <Check size={11} strokeWidth={2.5} />
                        {isPending ? 'Guardando...' : 'Guardar'}
                      </button>
                      {cat.cover_url && (
                        <button
                          onClick={() => { setCoverDraft(''); handleSaveCover({ ...cat, cover_url: null }) }}
                          disabled={isPending}
                          style={{
                            padding: '6px 12px', background: 'transparent',
                            border: '1px solid rgba(255,69,58,0.3)', borderRadius: 7,
                            fontSize: 12, color: '#FF453A', cursor: 'pointer', fontFamily: FONT,
                          }}
                        >
                          Quitar cover
                        </button>
                      )}
                      <button
                        onClick={handleCancelCover}
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, background: 'transparent', border: 'none',
                          color: 'var(--dash-text-tertiary)', cursor: 'pointer', borderRadius: 6,
                        }}
                      >
                        <X size={13} strokeWidth={2} />
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: '#3A3A3C' }}>
                      Acepta cualquier URL publica — Supabase Storage, Vimeo, etc. Deja vacio para usar la miniatura automatica.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {sorted.length === 0 && (
          <p style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--dash-text-tertiary)', margin: 0 }}>
            No hay categorías. Crea una para empezar.
          </p>
        )}
      </div>
    </div>
  )
}
