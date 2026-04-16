'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Check } from 'lucide-react'
import {
  createCategory,
  updateCategory,
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
}

interface Props {
  initialCategories: Category[]
}

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const INPUT: React.CSSProperties = {
  backgroundColor: '#1C1C1E',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 14,
  color: '#F5F5F7',
  fontFamily: FONT,
  outline: 'none',
  boxSizing: 'border-box',
}

export default function CategoryManager({ initialCategories }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cats, setCats] = useState<Category[]>(initialCategories)
  const [showNew, setShowNew] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sorted = [...cats].sort((a, b) => a.sort_order - b.sort_order)

  function slugify(str: string) {
    return str.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  }

  function handleNewLabelChange(val: string) {
    setNewLabel(val)
    setNewSlug(slugify(val))
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
    setError(null)
  }

  function handleSaveEdit(cat: Category) {
    if (!editLabel.trim()) return
    const fd = new FormData()
    fd.set('label', editLabel)
    startTransition(async () => {
      try {
        await updateCategory(cat.id, fd)
        setCats((prev) => prev.map((c) => c.id === cat.id ? { ...c, label: editLabel } : c))
        setEditingId(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
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

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`
        .cm-row { transition: background 0.12s; }
        .cm-row:hover { background: rgba(255,255,255,0.03) !important; }
        .cm-btn { transition: background 0.12s, color 0.12s; }
        .cm-btn:hover { background: #2C2C2E !important; color: #F5F5F7 !important; }
        .cm-del:hover { background: rgba(255,69,58,0.15) !important; color: #FF453A !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868B' }}>
            Categorías del portfolio
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#48484A' }}>
            Arrastra para reordenar — el orden se refleja en el sitio público
          </p>
        </div>
        <button
          onClick={() => { setShowNew(true); setError(null) }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, color: '#F5F5F7', cursor: 'pointer', fontFamily: FONT }}
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
          style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: 12, background: '#1C1C1E', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}
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
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#48484A' }}>slug: {newSlug}</p>
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
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'transparent', border: 'none', color: '#48484A', cursor: 'pointer', borderRadius: 6 }}
          >
            <X size={14} />
          </button>
        </form>
      )}

      {/* Category list */}
      <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {sorted.map((cat, idx) => (
          <div
            key={cat.id}
            className="cm-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderBottom: idx < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
              opacity: cat.is_visible ? 1 : 0.45,
            }}
          >
            {/* Up/Down */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button
                className="cm-btn"
                onClick={() => handleReorder(cat, 'up')}
                disabled={idx === 0 || isPending || reorderingId === cat.id}
                style={{ width: 20, height: 20, background: 'transparent', border: 'none', color: idx === 0 ? '#2C2C2E' : '#48484A', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 9, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >▲</button>
              <button
                className="cm-btn"
                onClick={() => handleReorder(cat, 'down')}
                disabled={idx === sorted.length - 1 || isPending || reorderingId === cat.id}
                style={{ width: 20, height: 20, background: 'transparent', border: 'none', color: idx === sorted.length - 1 ? '#2C2C2E' : '#48484A', cursor: idx === sorted.length - 1 ? 'not-allowed' : 'pointer', fontSize: 9, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >▼</button>
            </div>

            {/* Label / edit */}
            <div style={{ flex: 1 }}>
              {editingId === cat.id ? (
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(cat); if (e.key === 'Escape') setEditingId(null) }}
                  style={{ ...INPUT, padding: '5px 10px', fontSize: 13, width: '100%' }}
                />
              ) : (
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F7' }}>{cat.label}</span>
                  <span style={{ fontSize: 11, color: '#48484A', marginLeft: 8, fontFamily: 'monospace' }}>{cat.slug}</span>
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
                    style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: '#48484A', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                    style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: cat.is_visible ? '#86868B' : '#3A3A3C', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {cat.is_visible ? <Eye size={13} strokeWidth={1.5} /> : <EyeOff size={13} strokeWidth={1.5} />}
                  </button>
                  <button
                    className="cm-btn"
                    onClick={() => handleEdit(cat)}
                    title="Renombrar"
                    style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: '#86868B', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Pencil size={13} strokeWidth={1.5} />
                  </button>
                  <button
                    className="cm-btn cm-del"
                    onClick={() => handleDelete(cat)}
                    disabled={isPending}
                    title="Eliminar categoría"
                    style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: '#86868B', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <p style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#48484A', margin: 0 }}>
            No hay categorías. Crea una para empezar.
          </p>
        )}
      </div>
    </div>
  )
}
