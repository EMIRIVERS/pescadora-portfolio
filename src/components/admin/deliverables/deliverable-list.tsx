'use client'

import { useState, useCallback } from 'react'
import type { Deliverable, DeliverableType, DeliverableStatus } from '@/lib/supabase/types'
import { AddDeliverableForm } from '@/components/admin/deliverables/add-deliverable-form'
import { EditDeliverableForm } from '@/components/admin/deliverables/edit-deliverable-form'
import { ExternalLink, Pencil, Plus, ChevronDown, ChevronUp, Play } from 'lucide-react'

interface Props {
  projectId: string
  initialDeliverables: Deliverable[]
}

// ─── Design tokens (Apple dark) ──────────────────────────────────────────────
const S = {
  surface1: '#111111',
  surface2: '#1C1C1E',
  surface3: '#2C2C2E',
  border: 'rgba(255,255,255,0.08)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  textPrimary: '#F5F5F7',
  textSecondary: '#86868B',
  textTertiary: '#48484A',
  accent: '#0071E3',
  accentRed: '#FF453A',
} as const

// ─── Type pills ───────────────────────────────────────────────────────────────
const TYPE_PILL: Record<DeliverableType, { bg: string; text: string; ring: string }> = {
  wip:   { bg: 'rgba(255,159,10,0.14)',  text: '#FF9F0A', ring: 'rgba(255,159,10,0.25)' },
  final: { bg: 'rgba(48,209,88,0.14)',   text: '#30D158', ring: 'rgba(48,209,88,0.25)' },
}

const TYPE_LABELS: Record<DeliverableType, string> = {
  wip:   'WIP',
  final: 'Final',
}

// ─── Status pills ─────────────────────────────────────────────────────────────
const STATUS_PILL: Record<DeliverableStatus, { bg: string; text: string; ring: string }> = {
  pending:  { bg: 'rgba(72,72,74,0.5)',   text: '#86868B', ring: 'rgba(99,99,102,0.5)' },
  review:   { bg: 'rgba(10,132,255,0.14)', text: '#0A84FF', ring: 'rgba(10,132,255,0.25)' },
  approved: { bg: 'rgba(48,209,88,0.14)', text: '#30D158', ring: 'rgba(48,209,88,0.25)' },
}

const STATUS_LABELS: Record<DeliverableStatus, string> = {
  pending:  'Pendiente',
  review:   'En revision',
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
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
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
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
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
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      {label}
    </span>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────
interface DeliverableRowProps {
  deliverable: Deliverable
  isEditing: boolean
  onEdit: () => void
  onEditSuccess: (updated: Deliverable) => void
  onEditCancel: () => void
}

function DeliverableRow({
  deliverable,
  isEditing,
  onEdit,
  onEditSuccess,
  onEditCancel,
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
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
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

  const typePill   = TYPE_PILL[deliverable.type]
  const statusPill = STATUS_PILL[deliverable.status]

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
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          }}
        >
          {deliverable.title}
        </span>

        {/* Type pill */}
        <Pill bg={typePill.bg} text={typePill.text} ring={typePill.ring} label={TYPE_LABELS[deliverable.type]} />

        {/* Status pill */}
        <Pill bg={statusPill.bg} text={statusPill.text} ring={statusPill.ring} label={STATUS_LABELS[deliverable.status]} />

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
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
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
                fontFamily: "'SF Mono', ui-monospace, monospace",
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
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
              }}
            >
              Fecha limite: {formatDate(deliverable.due_date)}
            </p>
          )}
          <p
            style={{
              fontSize: 11,
              color: S.textTertiary,
              margin: 0,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            }}
          >
            Agregado {formatDate(deliverable.created_at)}
          </p>
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

  return (
    <div
      style={{
        background: S.surface1,
        borderRadius: 16,
        border: `1px solid ${S.border}`,
        overflow: 'hidden',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
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
              background: addHovered ? '#0077ED' : S.accent,
              border: 'none',
              cursor: 'pointer',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 500,
              transition: 'background 0.15s ease',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
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
              Sin entregables todavia.
            </p>
            <p style={{ fontSize: 12, color: S.textTertiary, marginTop: 4 }}>
              Agrega el primer archivo, enlace o exportacion del proyecto.
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
