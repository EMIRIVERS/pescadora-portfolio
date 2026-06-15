'use client'

import { useTransition, useState } from 'react'
import type { DeliverableStatus } from '@/lib/supabase/types'
import { approveDeliverable, rejectDeliverable } from '@/lib/actions/portal'

// ---------------------------------------------------------------------------
// Cinematic brand tokens
// ---------------------------------------------------------------------------

const CREAM = 'var(--portal-text)'
const MUTED = 'var(--portal-text-muted)'
const FAINT = 'var(--portal-text-dim)'
const ACCENT = 'var(--portal-accent)'
const BORDER = 'var(--portal-border)'
const SURFACE2 = 'var(--portal-surface-2)'
const SERIF = 'var(--portal-serif)'
const MONO = 'var(--portal-mono)'
const SANS = 'var(--portal-sans)'
const GREEN = 'var(--portal-badge-paid-color)'
const GREEN_BG = 'var(--portal-badge-paid-bg)'
const GREEN_BORDER = 'var(--portal-badge-paid-border)'

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
    marginTop: '1.4rem',
    paddingTop: '1.4rem',
    borderTop: `1px solid ${BORDER}`,
    fontFamily: SANS,
  }

  // ── Approved state ────────────────────────────────────────────────────────
  if (currentStatus === 'approved') {
    return (
      <div style={containerStyle}>
        <StyleBlock />

        <span
          className="flex items-center gap-2"
          style={{
            display: 'inline-flex',
            fontFamily: MONO,
            fontSize: '0.58rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: GREEN,
            marginBottom: currentFeedback || clientApprovedAt ? '0.7rem' : 0,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
          Aprobado
        </span>

        {clientApprovedAt && (
          <p
            style={{
              fontFamily: MONO,
              fontSize: '0.58rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: FAINT,
              margin: '0.3rem 0 0',
            }}
          >
            {formatDate(clientApprovedAt)}
          </p>
        )}

        {currentFeedback && (
          <p
            style={{
              fontFamily: SANS,
              fontSize: '0.85rem',
              color: CREAM,
              marginTop: '0.7rem',
              padding: '0.7rem 0.85rem',
              background: SURFACE2,
              border: `1px solid ${BORDER}`,
              borderRadius: '4px',
              lineHeight: 1.55,
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
          className="portal-textlink"
          style={{
            display: 'block',
            marginTop: '1rem',
            fontFamily: MONO,
            fontSize: '0.6rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: MUTED,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
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
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: '1.05rem',
            color: MUTED,
            margin: 0,
          }}
        >
          Pendiente de revisión — el equipo lo subirá pronto.
        </p>
      </div>
    )
  }

  // ── Review state (default — shows action buttons) ─────────────────────────
  return (
    <div style={containerStyle}>
      <StyleBlock />

      {/* Previously rejected feedback */}
      {currentFeedback && clientRejectedAt && (
        <div
          style={{
            padding: '0.85rem 1rem',
            background: 'rgba(232,52,26,0.07)',
            border: '1px solid rgba(232,52,26,0.22)',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
        >
          <p
            style={{
              fontFamily: MONO,
              fontSize: '0.58rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: ACCENT,
              margin: '0 0 0.5rem',
            }}
          >
            Cambios solicitados el {formatDate(clientRejectedAt)}
          </p>
          <p style={{ fontFamily: SANS, fontSize: '0.85rem', color: CREAM, margin: 0, lineHeight: 1.55 }}>
            {currentFeedback}
          </p>
        </div>
      )}

      {mode === 'idle' && (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isPending}
            className="dap-btn dap-btn-approve"
            style={{
              minHeight: 44,
              padding: '0.7rem 1.4rem',
              borderRadius: '4px',
              border: `1px solid ${GREEN_BORDER}`,
              background: isPending ? 'transparent' : GREEN_BG,
              color: GREEN,
              fontFamily: MONO,
              fontSize: '0.62rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'Procesando…' : 'Aprobar'}
          </button>

          <button
            type="button"
            onClick={() => { setMode('rejecting'); setErrorMsg(null) }}
            disabled={isPending}
            className="dap-btn dap-btn-reject"
            style={{
              minHeight: 44,
              padding: '0.7rem 1.4rem',
              borderRadius: '4px',
              border: `1px solid ${BORDER}`,
              background: 'transparent',
              color: MUTED,
              fontFamily: MONO,
              fontSize: '0.62rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            Pedir cambios
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
              className="dap-btn dap-btn-approve"
              style={{
                padding: '0.7rem 1.4rem',
                borderRadius: '4px',
                border: `1px solid ${GREEN_BORDER}`,
                background: GREEN_BG,
                color: GREEN,
                fontFamily: MONO,
                fontSize: '0.62rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
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
        <p style={{ fontFamily: SANS, fontSize: '0.82rem', color: ACCENT, marginTop: '0.7rem' }}>{errorMsg}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared hover styles
// ---------------------------------------------------------------------------

function StyleBlock() {
  return (
    <style>{`
      .dap-btn { transition: border-color 0.25s ease, background 0.25s ease, color 0.25s ease; }
      .dap-btn-approve:hover:not(:disabled) { background: rgba(48,209,88,0.20); color: #fff; }
      .dap-btn-reject:hover:not(:disabled) { border-color: ${ACCENT}; color: ${ACCENT}; }
      .dap-submit { transition: border-color 0.25s ease, background 0.25s ease, color 0.25s ease; }
      .dap-submit:hover:not(:disabled) { background: rgba(232,52,26,0.18); color: #fff; }
      .dap-textarea:focus { border-color: ${ACCENT}; }
    `}</style>
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
    <div style={{ marginTop: '1rem' }}>
      <textarea
        value={feedback}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          required
            ? 'Describe los cambios que necesitas… (obligatorio)'
            : 'Comentario opcional…'
        }
        rows={3}
        disabled={isPending}
        className="dap-textarea"
        style={{
          width: '100%',
          padding: '0.7rem 0.85rem',
          borderRadius: '4px',
          border: `1px solid ${BORDER}`,
          background: SURFACE2,
          color: CREAM,
          fontFamily: SANS,
          fontSize: '0.88rem',
          resize: 'vertical',
          outline: 'none',
          lineHeight: 1.55,
          boxSizing: 'border-box',
          transition: 'border-color 0.25s ease',
          opacity: isPending ? 0.6 : 1,
        }}
      />

      {errorMsg && (
        <p style={{ fontFamily: SANS, fontSize: '0.82rem', color: ACCENT, margin: '0.4rem 0 0' }}>{errorMsg}</p>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending}
          className="dap-submit"
          style={{
            padding: '0.7rem 1.4rem',
            borderRadius: '4px',
            border: `1px solid rgba(232,52,26,0.38)`,
            background: 'rgba(232,52,26,0.12)',
            color: ACCENT,
            fontFamily: MONO,
            fontSize: '0.62rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'Enviando…' : submitLabel}
        </button>

        {extraAction}

        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="portal-textlink"
          style={{
            padding: '0.7rem 1rem',
            borderRadius: '4px',
            border: 'none',
            background: 'none',
            color: MUTED,
            fontFamily: MONO,
            fontSize: '0.62rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
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
