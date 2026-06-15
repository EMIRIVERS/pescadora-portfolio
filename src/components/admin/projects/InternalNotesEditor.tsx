'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { saveInternalNotes } from '@/lib/actions/projects'

const FONT = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

interface Props {
  projectId: string
  initialNotes: string | null | undefined
}

export function InternalNotesEditor({ projectId, initialNotes }: Props) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [draft, setDraft] = useState(initialNotes ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleEdit() {
    setDraft(notes)
    setEditing(true)
    setError(null)
  }

  function handleCancel() {
    setEditing(false)
    setDraft(notes)
    setError(null)
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveInternalNotes(projectId, draft)
      if (result.error) {
        setError(result.error)
        return
      }
      setNotes(draft)
      setEditing(false)
    })
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--dash-text-primary)', fontFamily: FONT }}>
          Notas internas
        </h2>
        {!editing && (
          <button
            onClick={handleEdit}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', background: 'var(--dash-surface-2)',
              border: '1px solid var(--dash-border)', borderRadius: 8,
              fontSize: 12, color: 'var(--dash-text-secondary)', cursor: 'pointer', fontFamily: FONT,
            }}
          >
            <Pencil size={11} strokeWidth={1.5} />
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <div
          style={{
            backgroundColor: 'var(--dash-surface-2)',
            border: '1px solid rgba(var(--dash-accent-rgb),0.4)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            rows={6}
            placeholder="Notas internas del equipo..."
            style={{
              width: '100%',
              padding: '20px 24px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--dash-text-primary)',
              fontSize: 14,
              fontFamily: FONT,
              lineHeight: 1.6,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px',
              borderTop: '1px solid var(--dash-border)',
              background: 'var(--dash-surface-2)',
            }}
          >
            <button
              onClick={handleSave}
              disabled={isPending}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', background: 'var(--dash-accent)', border: 'none',
                borderRadius: 8, fontSize: 12, color: '#fff', cursor: 'pointer',
                opacity: isPending ? 0.5 : 1, fontFamily: FONT,
              }}
            >
              <Check size={11} strokeWidth={2.5} />
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={handleCancel}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', background: 'transparent', border: 'none',
                borderRadius: 8, fontSize: 12, color: 'var(--dash-text-tertiary)', cursor: 'pointer', fontFamily: FONT,
              }}
            >
              <X size={11} strokeWidth={2} />
              Cancelar
            </button>
            {error && <span style={{ fontSize: 12, color: 'var(--dash-danger)', fontFamily: FONT }}>{error}</span>}
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--dash-surface-2)',
            border: '1px solid var(--dash-border)',
            borderRadius: 16,
            padding: '20px 24px',
            fontSize: 14,
            color: notes ? 'var(--dash-text-secondary)' : 'var(--dash-text-tertiary)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            fontFamily: FONT,
            minHeight: 60,
            cursor: 'text',
          }}
          onClick={handleEdit}
        >
          {notes || 'Sin notas — haz clic para agregar...'}
        </div>
      )}
    </section>
  )
}
