'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Plus, X, Check, Trash2 } from 'lucide-react'
import {
  getAllClientTypes,
  createClientType,
  deleteClientType,
  setLeadClientTypes,
  type ClientType,
} from '@/lib/actions/client-types'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const COLOR_PALETTE = [
  '#FF453A', // red
  '#FF9F0A', // orange
  '#FFD60A', // yellow
  '#30D158', // green
  '#64D2FF', // cyan
  '#0A84FF', // blue
  '#BF5AF2', // purple
  '#FF375F', // pink
  '#8E8E93', // gray
]

interface Props {
  leadId: string
  initialSelected: ClientType[]
  allTypes: ClientType[]
  onTypesChange?: (types: ClientType[]) => void
}

export default function ClientTypePicker({ leadId, initialSelected, allTypes: initialAll, onTypesChange }: Props) {
  const [allTypes, setAllTypes] = useState<ClientType[]>(initialAll)
  const [selected, setSelected] = useState<ClientType[]>(initialSelected)
  const [open, setOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0])
  const [creating, setCreating] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const dropRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowNewForm(false)
        setNewLabel('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function isSelected(type: ClientType) {
    return selected.some((s) => s.id === type.id)
  }

  function toggle(type: ClientType) {
    const next = isSelected(type)
      ? selected.filter((s) => s.id !== type.id)
      : [...selected, type]
    setSelected(next)
    onTypesChange?.(next)
    startTransition(async () => {
      await setLeadClientTypes(leadId, next.map((t) => t.id))
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newLabel.trim()) return
    setCreating(true)
    try {
      const created = await createClientType(newLabel.trim(), newColor)
      const updatedAll = [...allTypes, created]
      setAllTypes(updatedAll)
      // Auto-select the new type
      const next = [...selected, created]
      setSelected(next)
      onTypesChange?.(next)
      await setLeadClientTypes(leadId, next.map((t) => t.id))
      setNewLabel('')
      setNewColor(COLOR_PALETTE[0])
      setShowNewForm(false)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(type: ClientType, e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm(`Eliminar tipo "${type.label}"? Se quitará de todos los leads.`)) return
    setDeletingId(type.id)
    await deleteClientType(type.id)
    const updatedAll = allTypes.filter((t) => t.id !== type.id)
    setAllTypes(updatedAll)
    const next = selected.filter((s) => s.id !== type.id)
    setSelected(next)
    onTypesChange?.(next)
    setDeletingId(null)
    // Refresh all types from server
    const fresh = await getAllClientTypes()
    setAllTypes(fresh)
  }

  function removeTag(type: ClientType) {
    const next = selected.filter((s) => s.id !== type.id)
    setSelected(next)
    onTypesChange?.(next)
    startTransition(async () => {
      await setLeadClientTypes(leadId, next.map((t) => t.id))
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--dash-text-secondary)',
        }}
      >
        Tipo de cliente
      </span>

      {/* Selected pills + add button */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
        {selected.map((type) => (
          <span
            key={type.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px 3px 9px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: FONT,
              color: type.color,
              background: `${type.color}22`,
              border: `1px solid ${type.color}44`,
              lineHeight: 1,
            }}
          >
            {type.label}
            <button
              onClick={() => removeTag(type)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: type.color,
                display: 'flex',
                alignItems: 'center',
                opacity: 0.6,
                lineHeight: 1,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6' }}
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          </span>
        ))}

        {/* Add button */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 9px',
              borderRadius: 20,
              fontSize: 12,
              fontFamily: FONT,
              background: 'var(--dash-surface-2)',
              border: '1px solid var(--dash-border)',
              color: 'var(--dash-text-secondary)',
              cursor: 'pointer',
              lineHeight: 1.4,
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--dash-surface-3)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--dash-surface-2)' }}
          >
            <Plus size={10} strokeWidth={2.5} />
            Agregar
          </button>

          {/* Dropdown */}
          {open && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                zIndex: 200,
                background: 'var(--dash-surface-1)',
                border: '1px solid var(--dash-border)',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                minWidth: 220,
                maxHeight: 320,
                overflowY: 'auto',
                padding: '6px 0',
                fontFamily: FONT,
              }}
            >
              {/* Type list */}
              {allTypes.length === 0 && (
                <p style={{ padding: '8px 14px', fontSize: 13, color: 'var(--dash-text-tertiary)', margin: 0 }}>
                  Sin tipos aún
                </p>
              )}
              {allTypes.map((type) => {
                const sel = isSelected(type)
                return (
                  <div
                    key={type.id}
                    onClick={() => toggle(type)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 12px',
                      cursor: 'pointer',
                      opacity: deletingId === type.id ? 0.3 : 1,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--dash-surface-2)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: `2px solid ${sel ? type.color : 'rgba(255,255,255,0.15)'}`,
                        background: sel ? type.color : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.12s',
                      }}
                    >
                      {sel && <Check size={9} strokeWidth={3} color="#000" />}
                    </div>

                    {/* Color dot */}
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: type.color,
                        flexShrink: 0,
                      }}
                    />

                    {/* Label */}
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--dash-text-primary)' }}>
                      {type.label}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={(e) => handleDelete(type, e)}
                      disabled={deletingId === type.id}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 2,
                        cursor: 'pointer',
                        color: 'var(--dash-text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: 4,
                        opacity: 0,
                        transition: 'opacity 0.1s',
                      }}
                      className="ctp-del-btn"
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.color = '#FF453A'
                        el.style.opacity = '1'
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.color = 'var(--dash-text-tertiary)'
                        el.style.opacity = '0'
                      }}
                    >
                      <Trash2 size={11} strokeWidth={1.5} />
                    </button>
                  </div>
                )
              })}

              {/* Divider + Create new */}
              <div style={{ height: 1, background: 'var(--dash-border)', margin: '4px 0' }} />

              {!showNewForm ? (
                <button
                  onClick={() => setShowNewForm(true)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--dash-text-secondary)',
                    fontFamily: FONT,
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--dash-surface-2)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <Plus size={12} strokeWidth={2} />
                  Crear nuevo tipo...
                </button>
              ) : (
                <form onSubmit={handleCreate} style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    autoFocus
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Nombre del tipo..."
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: 'var(--dash-surface-2)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: 8,
                      fontSize: 13,
                      color: 'var(--dash-text-primary)',
                      fontFamily: FONT,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onKeyDown={(e) => { if (e.key === 'Escape') setShowNewForm(false) }}
                  />
                  {/* Color picker */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: c,
                          border: newColor === c ? '2px solid white' : '2px solid transparent',
                          cursor: 'pointer',
                          padding: 0,
                          outline: 'none',
                          boxSizing: 'border-box',
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                  {/* Preview + submit */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {newLabel && (
                      <span style={{
                        padding: '2px 9px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 500,
                        color: newColor,
                        background: `${newColor}22`,
                        border: `1px solid ${newColor}44`,
                        fontFamily: FONT,
                      }}>
                        {newLabel}
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={creating || !newLabel.trim()}
                      style={{
                        marginLeft: 'auto',
                        padding: '5px 12px',
                        background: '#0071E3',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#fff',
                        cursor: creating ? 'wait' : 'pointer',
                        opacity: !newLabel.trim() ? 0.4 : 1,
                        fontFamily: FONT,
                      }}
                    >
                      {creating ? '...' : 'Crear'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hover reveal for delete buttons */}
      <style>{`
        .ctp-del-btn { opacity: 0 !important; }
        div:hover > .ctp-del-btn { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
