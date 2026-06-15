'use client'

import { useState, useCallback, useTransition } from 'react'
import type { Deliverable, DeliverableType, DeliverableStatus } from '@/lib/supabase/types'
import { updateDeliverable } from '@/lib/actions/deliverables'
import { AddDeliverableForm } from '@/components/admin/deliverables/add-deliverable-form'
import { EditDeliverableForm } from '@/components/admin/deliverables/edit-deliverable-form'
import { RevisionHistory } from '@/components/admin/deliverables/RevisionHistory'
import { ExternalLink, Loader2, Pencil, Plus, ChevronDown, ChevronUp, Play } from 'lucide-react'

interface Props {
  projectId: string
  initialDeliverables: Deliverable[]
}

// ─── Design tokens (Apple dark) ──────────────────────────────────────────────
const S = {
  surface1: 'var(--dash-surface-1)',
  surface2: 'var(--dash-surface-2)',
  surface3: 'var(--dash-surface-3)',
  border: 'var(--dash-border)',
  borderSubtle: 'var(--dash-border)',
  textPrimary: 'var(--dash-text-primary)',
  textSecondary: 'var(--dash-text-secondary)',
  textTertiary: 'var(--dash-text-tertiary)',
  accent: 'var(--dash-accent)',
  accentRed: 'var(--dash-danger)',
} as const

// ─── Type pills ───────────────────────────────────────────────────────────────
const TYPE_PILL: Record<DeliverableType, { bg: string; text: string; ring: string }> = {
  wip:   { bg: 'rgba(255,159,10,0.14)',  text: 'var(--dash-warning)', ring: 'rgba(255,159,10,0.25)' },
  final: { bg: 'rgba(48,209,88,0.14)',   text: 'var(--dash-success)', ring: 'rgba(48,209,88,0.25)' },
}

const TYPE_LABELS: Record<DeliverableType, string> = {
  wip:   'WIP',
  final: 'Final',
}

// ─── Status pills ─────────────────────────────────────────────────────────────
const STATUS_PILL: Record<DeliverableStatus, { bg: string; text: string; ring: string }> = {
  pending:  { bg: 'rgba(72,72,74,0.5)',   text: 'var(--dash-text-secondary)', ring: 'rgba(99,99,102,0.5)' },
  review:   { bg: 'rgba(10,132,255,0.14)', text: '#0A84FF', ring: 'rgba(10,132,255,0.25)' },
  approved: { bg: 'rgba(48,209,88,0.14)', text: 'var(--dash-success)', ring: 'rgba(48,209,88,0.25)' },
}

const STATUS_LABELS: Record<DeliverableStatus, string> = {
  pending:  'Pendiente',
  review:   'En revisión',
  approved: 'Aprobado',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Media helpers ────────────────────────────────────────────────────────────
function getMediaType(url: string | null): 'image' | 'video' | 'link' | null {
  if (!url) return null
  const lower = url.toLowerCase()
  if (/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/.test(lower)) return 'image'
  if (
    /\.(mp4|mov|webm)(\?|$)/.test(lower) ||
    lower.includes('vimeo.com') ||
    lower.includes('youtube.com') ||
    lower.includes('youtu.be')
  ) return 'video'
  return 'link'
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function MediaPreview({ url }: { url: string }) {
  const type = getMediaType(url)

  if (type === 'image') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'block', marginTop: 8 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Preview"
          style={{
            maxHeight: 120,
            width: 'auto',
            maxWidth: '100%',
            objectFit: 'contain',
            borderRadius: 8,
            background: S.surface3,
            display: 'block',
          }}
        />
      </a>
    )
  }

  if (type === 'video') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 6,
          marginTop: 8,
          height: 80,
          borderRadius: 8,
          background: S.surface2,
          textDecoration: 'none',
          border: `1px solid ${S.borderSubtle}`,
          cursor: 'pointer',
        }}
      >
        <Play size={20} style={{ color: S.textSecondary }} />
        <span
          style={{
            fontSize: 11,
            color: S.textSecondary,
            fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
        >
          {safeHostname(url)}
        </span>
      </a>
    )
  }

  if (type === 'link') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 6,
          fontSize: 12,
          color: S.accent,
          textDecoration: 'none',
          fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
      >
        <ExternalLink size={12} />
        {safeHostname(url)}
      </a>
    )
  }

  return null
}

// ─── Pill component ───────────────────────────────────────────────────────────
function Pill({ bg, text, ring, label }: { bg: string; text: string; ring: string; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.01em',
        background: bg,
        color: text,
        boxShadow: `0 0 0 1px ${ring}`,
        fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      {label}
    </span>
  )
}

// ─── Status quick-picker ──────────────────────────────────────────────────────
const STATUS_SEQUENCE: DeliverableStatus[] = ['pending', 'review', 'approved']

interface StatusQuickPickerProps {
  deliverable: Deliverable
  onStatusChanged: (updated: Deliverable) => void
}

function StatusQuickPicker({ deliverable, onStatusChanged }: StatusQuickPickerProps) {
  const [open, setOpen]       = useState(false)
  const [isPending, start]    = useTransition()
  const [errorMsg, setErrMsg] = useState<string | null>(null)

  const font = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

  function handlePick(newStatus: DeliverableStatus) {
    if (newStatus === deliverable.status) {
      setOpen(false)
      return
    }
    setErrMsg(null)
    start(async () => {
      const result = await updateDeliverable({
        id:          deliverable.id,
        projectId:   deliverable.project_id,
        title:       deliverable.title,
        description: deliverable.description,
        url:         deliverable.url,
        due_date:    deliverable.due_date,
        type:        deliverable.type,
        status:      newStatus,
      })
      if (result.error || !result.data) {
        setErrMsg(result.error ?? 'Error al cambiar estado.')
        return
      }
      onStatusChanged(result.data)
      setOpen(false)
    })
  }

  const pill = STATUS_PILL[deliverable.status]

  if (open) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          position: 'relative',
        }}
      >
        {isPending && (
          <Loader2
            size={12}
            className="animate-spin"
            style={{ color: S.textTertiary, flexShrink: 0 }}
          />
        )}
        {STATUS_SEQUENCE.map((s) => {
          const p = STATUS_PILL[s]
          const isActive = s === deliverable.status
          return (
            <button
              key={s}
              type="button"
              disabled={isPending}
              onClick={() => handlePick(s)}
              title={STATUS_LABELS[s]}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.01em',
                background: p.bg,
                color: p.text,
                boxShadow: isActive ? `0 0 0 1.5px ${p.text}` : `0 0 0 1px ${p.ring}`,
                border: 'none',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontFamily: font,
                opacity: isPending ? 0.6 : 1,
                transition: 'box-shadow 0.12s ease',
              }}
            >
              {STATUS_LABELS[s]}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => { setOpen(false); setErrMsg(null) }}
          disabled={isPending}
          style={{
            padding: '2px 6px',
            borderRadius: 999,
            fontSize: 11,
            background: 'transparent',
            border: `1px solid ${S.border}`,
            color: S.textTertiary,
            cursor: 'pointer',
            fontFamily: font,
            lineHeight: 1.4,
          }}
        >
          &times;
        </button>
        {errorMsg && (
          <span
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              fontSize: 10,
              color: S.accentRed,
              fontFamily: font,
              whiteSpace: 'nowrap',
              background: S.surface1,
              padding: '2px 6px',
              borderRadius: 4,
              border: `1px solid rgba(255,69,58,0.25)`,
              zIndex: 10,
            }}
          >
            {errorMsg}
          </span>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      title="Cambiar estado"
      onClick={() => setOpen(true)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.01em',
        background: pill.bg,
        color: pill.text,
        boxShadow: `0 0 0 1px ${pill.ring}`,
        border: 'none',
        cursor: 'pointer',
        fontFamily: font,
        transition: 'box-shadow 0.12s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 1.5px ${pill.text}`
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 1px ${pill.ring}`
      }}
    >
      {STATUS_LABELS[deliverable.status]}
    </button>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────
interface DeliverableRowProps {
  deliverable: Deliverable
  isEditing: boolean
  onEdit: () => void
  onEditSuccess: (updated: Deliverable) => void
  onEditCancel: () => void
  onStatusChanged: (updated: Deliverable) => void
}

function DeliverableRow({
  deliverable,
  isEditing,
  onEdit,
  onEditSuccess,
  onEditCancel,
  onStatusChanged,
}: DeliverableRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  if (isEditing) {
    return (
      <div
        style={{
          borderRadius: 12,
          background: S.surface2,
          border: `1px solid ${S.border}`,
          padding: '20px',
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: S.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 16,
            fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
        >
          Editar entregable
        </p>
        <EditDeliverableForm
          deliverable={deliverable}
          onSuccess={onEditSuccess}
          onCancel={onEditCancel}
        />
      </div>
    )
  }

  const typePill = TYPE_PILL[deliverable.type]

  return (
    <div
      style={{
        borderRadius: 12,
        background: hovered ? S.surface2 : 'transparent',
        borderBottom: `1px solid ${S.borderSubtle}`,
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
        }}
      >
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Contraer' : 'Expandir'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            flexShrink: 0,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: S.textTertiary,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = S.textSecondary }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = S.textTertiary }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Title */}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 14,
            fontWeight: 500,
            color: S.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
        >
          {deliverable.title}
        </span>

        {/* Type pill */}
        <Pill bg={typePill.bg} text={typePill.text} ring={typePill.ring} label={TYPE_LABELS[deliverable.type]} />

        {/* Status — click to quick-change */}
        <StatusQuickPicker deliverable={deliverable} onStatusChanged={onStatusChanged} />

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {deliverable.url && (
            <a
              href={deliverable.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir URL"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 6,
                color: S.accent,
                textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = S.surface3 }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
            >
              <ExternalLink size={13} />
            </a>
          )}
          <button
            type="button"
            onClick={onEdit}
            title="Editar entregable"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: S.textTertiary,
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.background = S.surface3
              b.style.color = S.textSecondary
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.background = 'transparent'
              b.style.color = S.textTertiary
            }}
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            borderTop: `1px solid ${S.borderSubtle}`,
            padding: '12px 16px 14px 46px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {deliverable.description && (
            <p
              style={{
                fontSize: 13,
                color: S.textSecondary,
                lineHeight: 1.55,
                margin: 0,
                fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            >
              {deliverable.description}
            </p>
          )}
          {deliverable.url && <MediaPreview url={deliverable.url} />}
          {deliverable.url && (
            <a
              href={deliverable.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                color: S.accent,
                fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                textDecoration: 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {deliverable.url}
            </a>
          )}
          {deliverable.due_date && (
            <p
              style={{
                fontSize: 11,
                color: S.textTertiary,
                margin: 0,
                fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            >
              Fecha límite: {formatDate(deliverable.due_date)}
            </p>
          )}
          <p
            style={{
              fontSize: 11,
              color: S.textTertiary,
              margin: 0,
              fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
          >
            Agregado {formatDate(deliverable.created_at)}
          </p>

          {/* Revision history panel */}
          <RevisionHistory
            deliverableId={deliverable.id}
            currentUrl={deliverable.url}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main list ────────────────────────────────────────────────────────────────
export function DeliverableList({ projectId, initialDeliverables }: Props) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables)
  const [showForm, setShowForm]         = useState(false)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [addHovered, setAddHovered]     = useState(false)

  const handleAdded = useCallback((newDeliverable: Deliverable) => {
    setDeliverables((prev) => [newDeliverable, ...prev])
    setShowForm(false)
  }, [])

  const handleEditSuccess = useCallback((updated: Deliverable) => {
    setDeliverables((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d))
    )
    setEditingId(null)
  }, [])

  const handleStatusChanged = useCallback((updated: Deliverable) => {
    setDeliverables((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d))
    )
  }, [])

  return (
    <div
      style={{
        background: S.surface1,
        borderRadius: 16,
        border: `1px solid ${S.border}`,
        overflow: 'hidden',
        fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: `1px solid ${S.border}`,
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: S.textPrimary,
            letterSpacing: '-0.01em',
          }}
        >
          Entregables
        </span>

        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null)
              setShowForm(true)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 8,
              background: addHovered ? 'var(--dash-accent-hover)' : S.accent,
              border: 'none',
              cursor: 'pointer',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 500,
              transition: 'background 0.15s ease',
              fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
            onMouseEnter={() => setAddHovered(true)}
            onMouseLeave={() => setAddHovered(false)}
          >
            <Plus size={14} strokeWidth={2.5} />
            Agregar
          </button>
        )}
      </div>

      {/* Body */}
      <div>
        {/* Empty state */}
        {deliverables.length === 0 && !showForm && (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 14, color: S.textSecondary, margin: 0 }}>
              Sin entregables todavía.
            </p>
            <p style={{ fontSize: 12, color: S.textTertiary, marginTop: 4 }}>
              Agrega el primer archivo, enlace o exportación del proyecto.
            </p>
          </div>
        )}

        {/* Rows */}
        {deliverables.map((d) => (
          <DeliverableRow
            key={d.id}
            deliverable={d}
            isEditing={editingId === d.id}
            onEdit={() => {
              setShowForm(false)
              setEditingId(d.id)
            }}
            onEditSuccess={handleEditSuccess}
            onEditCancel={() => setEditingId(null)}
            onStatusChanged={handleStatusChanged}
          />
        ))}

        {/* Add form */}
        {showForm && (
          <div
            style={{
              borderTop: deliverables.length > 0 ? `1px solid ${S.border}` : undefined,
              padding: '20px 16px',
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: S.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 16,
              }}
            >
              Nuevo entregable
            </p>
            <AddDeliverableForm
              projectId={projectId}
              onSuccess={handleAdded}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
