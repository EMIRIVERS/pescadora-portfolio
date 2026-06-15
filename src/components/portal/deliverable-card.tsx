'use client'

import { useState } from 'react'
import { ExternalLink, MessageSquare, ChevronDown } from 'lucide-react'
import type { Deliverable, DeliverableType, DeliverableStatus } from '@/lib/supabase/types'
import DeliverableComments from '@/components/shared/deliverable-comments'
import DeliverableApprovalPanel from '@/components/portal/DeliverableApprovalPanel'
import { PORTAL } from '@/components/portal/ui'

// ---------------------------------------------------------------------------
// Badge configs
// ---------------------------------------------------------------------------

const TYPE_BADGE: Record<DeliverableType, { label: string; color: string }> = {
  wip: { label: 'WIP', color: '#f5b942' },
  final: { label: 'Final', color: '#4cd97a' },
}

const STATUS_BADGE: Record<DeliverableStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: PORTAL.muted },
  review: { label: 'En revisión', color: '#5ac8fa' },
  approved: { label: 'Aprobado', color: '#4cd97a' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DeliverableCardProps {
  deliverable: Deliverable
  revisionCount?: number
}

export default function DeliverableCard({ deliverable, revisionCount }: DeliverableCardProps) {
  const typeBadge = TYPE_BADGE[deliverable.type]
  const statusBadge = STATUS_BADGE[deliverable.status]
  const hasUrl = deliverable.url !== null && deliverable.url !== ''
  const [commentsOpen, setCommentsOpen] = useState(false)

  return (
    <div className="portal-card" style={{ borderRadius: '6px', padding: 'clamp(1.25rem, 3vw, 1.6rem)' }}>
      <div className="flex flex-wrap items-start gap-4">
        {/* Left — title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2" style={{ marginBottom: '0.6rem' }}>
            <h3
              style={{
                fontFamily: PORTAL.serif,
                fontWeight: 500,
                fontSize: 'clamp(1.15rem, 2.2vw, 1.45rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                color: PORTAL.cream,
                margin: 0,
              }}
            >
              {deliverable.title}
            </h3>
            <span
              style={{
                fontFamily: PORTAL.mono,
                fontSize: '0.56rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: typeBadge.color,
                border: `1px solid ${typeBadge.color}`,
                borderRadius: '2px',
                padding: '0.15rem 0.45rem',
                opacity: 0.92,
              }}
            >
              {typeBadge.label}
            </span>
            {/* Revision badge — only shown when there is at least one revision */}
            {typeof revisionCount === 'number' && revisionCount > 0 && (
              <span
                style={{
                  fontFamily: PORTAL.mono,
                  fontSize: '0.56rem',
                  letterSpacing: '0.1em',
                  color: PORTAL.muted,
                  border: `1px solid ${PORTAL.border}`,
                  borderRadius: '2px',
                  padding: '0.15rem 0.4rem',
                }}
              >
                v{revisionCount}
              </span>
            )}
          </div>

          {deliverable.description && (
            <p style={{ fontFamily: PORTAL.sans, fontSize: '0.85rem', lineHeight: 1.6, color: PORTAL.muted, margin: 0 }}>
              {deliverable.description}
            </p>
          )}
        </div>

        {/* Right — status badge + view button */}
        <div className="flex items-center gap-4 shrink-0" style={{ marginTop: '0.2rem' }}>
          <span
            className="flex items-center gap-2"
            style={{
              fontFamily: PORTAL.mono,
              fontSize: '0.58rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: statusBadge.color,
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusBadge.color }} />
            {statusBadge.label}
          </span>

          {hasUrl ? (
            <a
              href={deliverable.url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="portal-textlink inline-flex items-center gap-1.5"
              style={{
                fontFamily: PORTAL.mono,
                fontSize: '0.6rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: PORTAL.accent,
              }}
            >
              <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
              Ver
            </a>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 select-none cursor-not-allowed"
              style={{
                fontFamily: PORTAL.mono,
                fontSize: '0.6rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: PORTAL.dim,
              }}
            >
              <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
              Ver
            </span>
          )}
        </div>
      </div>

      {/* Approval panel */}
      <DeliverableApprovalPanel
        deliverableId={deliverable.id}
        currentStatus={deliverable.status}
        currentFeedback={deliverable.client_feedback}
        clientApprovedAt={deliverable.client_approved_at}
        clientRejectedAt={deliverable.client_rejected_at}
      />

      {/* Comments section */}
      <div style={{ marginTop: '1.1rem', paddingTop: '1.1rem', borderTop: `1px solid ${PORTAL.border}` }}>
        <button
          type="button"
          onClick={() => setCommentsOpen((prev) => !prev)}
          className="portal-textlink inline-flex items-center gap-1.5"
          style={{
            fontFamily: PORTAL.mono,
            fontSize: '0.6rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
          Comentarios
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${commentsOpen ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
        </button>

        {commentsOpen && (
          <div className="mt-3">
            <DeliverableComments deliverableId={deliverable.id} />
          </div>
        )}
      </div>
    </div>
  )
}
