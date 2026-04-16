'use client'

import { useTransition, useState } from 'react'
import type { DeliverableStatus } from '@/lib/supabase/types'
import { approveDeliverable, rejectDeliverable } from '@/lib/actions/portal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeliverableApprovalPanelProps {
  deliverableId: string
  currentStatus: DeliverableStatus
  currentFeedback: string | null
  clientApprovedAt: string | null
  clientRejectedAt: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeliverableApprovalPanel({
  deliverableId,
  currentStatus,
  currentFeedback,
  clientApprovedAt,
  clientRejectedAt,
}: DeliverableApprovalPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle')

  function handleApprove() {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await approveDeliverable(
        deliverableId,
        feedback.trim() || undefined,
      )
      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setFeedback('')
        setMode('idle')
      }
    })
  }

  function handleReject() {
    if (!feedback.trim()) {
      setErrorMsg('Por favor escribe un comentario antes de solicitar cambios.')
      return
    }
    setErrorMsg(null)
    startTransition(async () => {
      const result = await rejectDeliverable(deliverableId, feedback.trim())
      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setFeedback('')
        setMode('idle')
      }
    })
  }

  // Shared container style
  const containerStyle: React.CSSProperties = {
    marginTop: 16,
    paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  }

  // ── Approved state ────────────────────────────────────────────────────────
  if (currentStatus === 'approved') {
    return (
      <div style={containerStyle}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(52,199,89,0.12)',
            border: '1px solid rgba(52,199,89,0.25)',
            marginBottom: currentFeedback || clientApprovedAt ? 8 : 0,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#34C759',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#34C759',
              letterSpacing: '0.01em',
            }}
          >
            Aprobado
          </span>
        </div>

        {clientApprovedAt && (
          <p style={{ fontSize: 11, color: '#86868B', margin: '4px 0 0' }}>
            {formatDate(clientApprovedAt)}
          </p>
        )}

        {currentFeedback && (
          <p
            style={{
              fontSize: 12,
              color: '#AEAEB2',
              marginTop: 6,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 8,
              lineHeight: 1.5,
            }}
          >
            {currentFeedback}
          </p>
        )}

        {/* Allow re-opening review */}
        <button
          type="button"
          onClick={() => { setMode('rejecting'); setErrorMsg(null) }}
          disabled={isPending}
          style={{
            marginTop: 10,
            fontSize: 11,
            color: '#86868B',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Solicitar cambios
        </button>

        {mode === 'rejecting' && (
          <FeedbackForm
            feedback={feedback}
            onChange={setFeedback}
            onCancel={() => { setMode('idle'); setErrorMsg(null); setFeedback('') }}
            onSubmit={handleReject}
            isPending={isPending}
            submitLabel="Solicitar cambios"
            required
            errorMsg={errorMsg}
          />
        )}
      </div>
    )
  }

  // ── Pending state ─────────────────────────────────────────────────────────
  if (currentStatus === 'pending') {
    return (
      <div style={containerStyle}>
        <p
          style={{
            fontSize: 12,
            color: '#636366',
            fontStyle: 'italic',
          }}
        >
          Pendiente de revision — el equipo lo subira pronto.
        </p>
      </div>
    )
  }

  // ── Review state (default — shows action buttons) ─────────────────────────
  return (
    <div style={containerStyle}>
      {/* Previously rejected feedback */}
      {currentFeedback && clientRejectedAt && (
        <div
          style={{
            padding: '8px 10px',
            background: 'rgba(255,69,58,0.07)',
            border: '1px solid rgba(255,69,58,0.18)',
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <p style={{ fontSize: 11, color: '#FF6961', margin: '0 0 4px', fontWeight: 600 }}>
            Cambios solicitados el {formatDate(clientRejectedAt)}
          </p>
          <p style={{ fontSize: 12, color: '#AEAEB2', margin: 0, lineHeight: 1.5 }}>
            {currentFeedback}
          </p>
        </div>
      )}

      {mode === 'idle' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isPending}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: '1px solid rgba(52,199,89,0.35)',
              background: isPending ? 'rgba(52,199,89,0.06)' : 'rgba(52,199,89,0.10)',
              color: '#34C759',
              fontSize: 13,
              fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'Procesando...' : 'Aprobar'}
          </button>

          <button
            type="button"
            onClick={() => { setMode('rejecting'); setErrorMsg(null) }}
            disabled={isPending}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.04)',
              color: '#AEAEB2',
              fontSize: 13,
              fontWeight: 500,
              cursor: isPending ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            Solicitar cambios
          </button>
        </div>
      )}

      {mode === 'rejecting' && (
        <FeedbackForm
          feedback={feedback}
          onChange={setFeedback}
          onCancel={() => { setMode('idle'); setErrorMsg(null); setFeedback('') }}
          onSubmit={handleReject}
          isPending={isPending}
          submitLabel="Solicitar cambios"
          required
          errorMsg={errorMsg}
          extraAction={
            <button
              type="button"
              onClick={handleApprove}
              disabled={isPending}
              style={{
                padding: '7px 16px',
                borderRadius: 8,
                border: '1px solid rgba(52,199,89,0.35)',
                background: 'rgba(52,199,89,0.10)',
                color: '#34C759',
                fontSize: 13,
                fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.6 : 1,
              }}
            >
              Aprobar con comentario
            </button>
          }
        />
      )}

      {mode === 'idle' && errorMsg && (
        <p style={{ fontSize: 12, color: '#FF453A', marginTop: 8 }}>{errorMsg}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FeedbackForm — shared sub-component
// ---------------------------------------------------------------------------

interface FeedbackFormProps {
  feedback: string
  onChange: (v: string) => void
  onCancel: () => void
  onSubmit: () => void
  isPending: boolean
  submitLabel: string
  required?: boolean
  errorMsg: string | null
  extraAction?: React.ReactNode
}

function FeedbackForm({
  feedback,
  onChange,
  onCancel,
  onSubmit,
  isPending,
  submitLabel,
  required = false,
  errorMsg,
  extraAction,
}: FeedbackFormProps) {
  return (
    <div style={{ marginTop: 10 }}>
      <textarea
        value={feedback}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          required
            ? 'Describe los cambios que necesitas... (obligatorio)'
            : 'Comentario opcional...'
        }
        rows={3}
        disabled={isPending}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
          color: '#F5F5F7',
          fontSize: 13,
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          boxSizing: 'border-box',
          opacity: isPending ? 0.6 : 1,
        }}
      />

      {errorMsg && (
        <p style={{ fontSize: 12, color: '#FF453A', margin: '4px 0 0' }}>{errorMsg}</p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending}
          style={{
            padding: '7px 16px',
            borderRadius: 8,
            border: '1px solid rgba(255,69,58,0.35)',
            background: 'rgba(255,69,58,0.10)',
            color: '#FF453A',
            fontSize: 13,
            fontWeight: 600,
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'Enviando...' : submitLabel}
        </button>

        {extraAction}

        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          style={{
            padding: '7px 16px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'none',
            color: '#86868B',
            fontSize: 13,
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
