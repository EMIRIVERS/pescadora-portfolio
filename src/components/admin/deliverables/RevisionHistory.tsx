'use client'

import { useState, useEffect, useTransition } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { getRevisions, addRevision } from '@/lib/actions/deliverables'
import type { DeliverableRevision } from '@/lib/supabase/types'

// ─── Design tokens (Apple dark — matches deliverable-list.tsx) ────────────────
const S = {
  surface1:      'var(--dash-surface-1)',
  surface2:      'var(--dash-surface-2)',
  surface3:      'var(--dash-surface-3)',
  border:        'var(--dash-border)',
  borderSubtle:  'var(--dash-border)',
  textPrimary:   'var(--dash-text-primary)',
  textSecondary: 'var(--dash-text-secondary)',
  textTertiary:  'var(--dash-text-tertiary)',
  accent:        '#0071E3',
  accentRed:     '#FF453A',
  font:          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
  mono:          "'SF Mono', ui-monospace, monospace",
} as const

// ─── Shared input style ────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: S.surface2,
  border: `1px solid ${S.border}`,
  borderRadius: 8,
  padding: '8px 11px',
  fontSize: 13,
  color: S.textPrimary,
  fontFamily: S.font,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  color: S.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 5,
  fontFamily: S.font,
}

// ─── Helper ────────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface RevisionHistoryProps {
  deliverableId: string
  currentUrl: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────
export function RevisionHistory({ deliverableId, currentUrl }: RevisionHistoryProps) {
  const [revisions, setRevisions] = useState<DeliverableRevision[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [url, setUrl]     = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Focus tracking for focus ring
  const [focused, setFocused] = useState<string | null>(null)

  // Load revisions on mount
  useEffect(() => {
    let cancelled = false
    // Reset the loading indicator whenever the deliverable to display changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getRevisions(deliverableId)
      .then((rows) => {
        if (!cancelled) {
          setRevisions(rows)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [deliverableId])

  function handleOpenForm() {
    setUrl(currentUrl ?? '')
    setNotes('')
    setError(null)
    setShowForm(true)
  }

  function handleCancel() {
    setShowForm(false)
    setError(null)
  }

  function handleSave() {
    const trimmedUrl = url.trim() || null
    if (trimmedUrl && !/^https?:\/\/.+/.test(trimmedUrl)) {
      setError('La URL debe comenzar con http:// o https://')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await addRevision(deliverableId, {
        url: trimmedUrl,
        notes: notes.trim() || null,
      })

      if (result.error || !result.data) {
        setError(result.error ?? 'No se pudo guardar la revision.')
        return
      }

      setRevisions((prev) => [...prev, result.data as DeliverableRevision])
      setShowForm(false)
      setUrl('')
      setNotes('')
    })
  }

  function focusRing(name: string): React.CSSProperties {
    return focused === name
      ? { borderColor: S.accent, boxShadow: `0 0 0 3px rgba(0,113,227,0.18)` }
      : {}
  }

  return (
    <div
      style={{
        marginTop: 14,
        borderTop: `1px solid ${S.borderSubtle}`,
        paddingTop: 12,
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: S.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            fontFamily: S.font,
          }}
        >
          Historial de revisiones
        </span>

        {!showForm && (
          <button
            type="button"
            onClick={handleOpenForm}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              background: S.surface3,
              border: `1px solid ${S.border}`,
              color: S.textSecondary,
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: S.font,
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.color = S.textPrimary
              b.style.borderColor = 'rgba(255,255,255,0.18)'
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.color = S.textSecondary
              b.style.borderColor = S.border
            }}
          >
            <Plus size={11} strokeWidth={2.5} />
            Nueva revision
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
          <Loader2 size={12} className="animate-spin" style={{ color: S.textTertiary }} />
          <span style={{ fontSize: 12, color: S.textTertiary, fontFamily: S.font }}>
            Cargando...
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && revisions.length === 0 && !showForm && (
        <p style={{ fontSize: 12, color: S.textTertiary, fontFamily: S.font, margin: 0 }}>
          Sin revisiones registradas.
        </p>
      )}

      {/* Timeline */}
      {!loading && revisions.length > 0 && (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {revisions.map((rev, idx) => {
            const isLast = idx === revisions.length - 1
            return (
              <li
                key={rev.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr',
                  gap: '0 10px',
                  position: 'relative',
                }}
              >
                {/* Track line + dot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: isLast ? S.accent : S.surface3,
                      border: `1.5px solid ${isLast ? S.accent : S.textTertiary}`,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  {!isLast && (
                    <div
                      style={{
                        width: 1,
                        flex: 1,
                        background: S.borderSubtle,
                        minHeight: 12,
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div style={{ paddingBottom: isLast ? 0 : 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: isLast ? S.accent : S.textSecondary,
                        fontFamily: S.mono,
                        letterSpacing: '0.02em',
                      }}
                    >
                      v{rev.revision_number}
                    </span>
                    <span style={{ fontSize: 10, color: S.textTertiary, fontFamily: S.font }}>
                      {formatDate(rev.created_at)}
                    </span>
                  </div>

                  {rev.url && (
                    <a
                      href={rev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        marginTop: 2,
                        fontSize: 11,
                        color: S.accent,
                        fontFamily: S.mono,
                        textDecoration: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}
                    >
                      {rev.url}
                    </a>
                  )}

                  {rev.notes && (
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: 11,
                        color: S.textSecondary,
                        fontFamily: S.font,
                        lineHeight: 1.45,
                      }}
                    >
                      {rev.notes}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {/* Inline new-revision form */}
      {showForm && (
        <div
          style={{
            borderRadius: 10,
            background: S.surface2,
            border: `1px solid ${S.border}`,
            padding: '14px 14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginTop: revisions.length > 0 ? 10 : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: S.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontFamily: S.font,
              }}
            >
              Nueva revision — v{revisions.length + 1}
            </span>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: S.textTertiary,
                padding: 0,
              }}
            >
              <X size={12} />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                borderRadius: 6,
                background: 'rgba(255,69,58,0.10)',
                border: '1px solid rgba(255,69,58,0.25)',
                padding: '7px 10px',
                fontSize: 12,
                color: S.accentRed,
                fontFamily: S.font,
              }}
            >
              {error}
            </div>
          )}

          {/* URL field */}
          <div>
            <label style={labelStyle}>URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setFocused('url')}
              onBlur={() => setFocused(null)}
              disabled={isPending}
              placeholder="https://frame.io/..."
              style={{
                ...inputStyle,
                ...focusRing('url'),
                fontFamily: S.mono,
                opacity: isPending ? 0.5 : 1,
              }}
            />
          </div>

          {/* Notes field */}
          <div>
            <label style={labelStyle}>Notas (opcional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={() => setFocused('notes')}
              onBlur={() => setFocused(null)}
              disabled={isPending}
              placeholder="Cambios incluidos en esta revision..."
              style={{
                ...inputStyle,
                ...focusRing('notes'),
                resize: 'none',
                lineHeight: 1.5,
                opacity: isPending ? 0.5 : 1,
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              style={{
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                background: 'transparent',
                border: `1px solid ${S.border}`,
                color: S.textSecondary,
                cursor: 'pointer',
                fontFamily: S.font,
                opacity: isPending ? 0.5 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                background: S.accent,
                border: 'none',
                color: '#FFFFFF',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontFamily: S.font,
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending && <Loader2 size={11} className="animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
