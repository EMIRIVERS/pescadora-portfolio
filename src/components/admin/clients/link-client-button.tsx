'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Link2, Link2Off, Loader2, X, CheckCircle2 } from 'lucide-react'
import { linkClientToUser, unlinkClientFromUser } from '../../../../app/actions/clients'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  clientId: string
  clientName: string
  currentProfileId: string | null
}

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  clientId: string
  onClose: () => void
  onSuccess: () => void
}

function LinkModal({ clientId, onClose, onSuccess }: ModalProps) {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [focused, setFocused] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPending, onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current && !isPending) onClose()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) { setError('El email es obligatorio.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Introduce un email valido.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await linkClientToUser(clientId, trimmed)
      if (result.error) { setError(result.error); return }
      setDone(true)
      onSuccess()
    })
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '16px',
      }}
      aria-modal="true"
      role="dialog"
      aria-label="Vincular cuenta de cliente"
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--dash-surface-2)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <h2
            style={{
              fontFamily: SF,
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--dash-text-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Vincular cuenta al portal
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Cerrar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'var(--dash-border)',
              color: 'var(--dash-text-secondary)',
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.5 : 1,
              transition: 'background-color 0.15s ease',
              flexShrink: 0,
            }}
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {done ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '28px 20px',
                backgroundColor: 'rgba(48,209,88,0.08)',
                border: '1px solid rgba(48,209,88,0.2)',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <CheckCircle2 className="w-8 h-8" style={{ color: '#30D158' }} strokeWidth={1.5} />
              <div>
                <p style={{ fontFamily: SF, fontSize: '15px', fontWeight: 600, color: 'var(--dash-text-primary)', marginBottom: '4px' }}>
                  Cuenta vinculada
                </p>
                <p style={{ fontFamily: SF, fontSize: '13px', color: 'var(--dash-text-secondary)' }}>
                  El cliente ya tiene acceso al portal.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  fontFamily: SF,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#0071E3',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ fontFamily: SF, fontSize: '13px', color: 'var(--dash-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Introduce el email con el que el cliente tiene cuenta en Supabase Auth. Si aun no tiene cuenta, usa &ldquo;Invitar cliente&rdquo; primero.
              </p>

              {error && (
                <div
                  style={{
                    backgroundColor: 'rgba(255,69,58,0.08)',
                    border: '1px solid rgba(255,69,58,0.2)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontFamily: SF,
                    fontSize: '13px',
                    color: '#FF453A',
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="link-email"
                  style={{
                    fontFamily: SF,
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--dash-text-secondary)',
                    letterSpacing: '0.01em',
                  }}
                >
                  Email de la cuenta <span style={{ color: '#FF453A' }}>*</span>
                </label>
                <input
                  id="link-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  disabled={isPending}
                  autoComplete="off"
                  placeholder="cliente@email.com"
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={{
                    fontFamily: SF,
                    fontSize: '15px',
                    color: 'var(--dash-text-primary)',
                    backgroundColor: 'var(--dash-surface-3)',
                    border: focused
                      ? '1px solid rgba(0,113,227,0.7)'
                      : error
                      ? '1px solid rgba(255,69,58,0.6)'
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    outline: 'none',
                    width: '100%',
                    transition: 'border-color 0.15s ease',
                    opacity: isPending ? 0.5 : 1,
                    boxShadow: focused ? '0 0 0 3px rgba(0,113,227,0.12)' : 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  style={{
                    fontFamily: SF,
                    fontSize: '15px',
                    fontWeight: 500,
                    color: 'var(--dash-text-secondary)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.5 : 1,
                    padding: '8px 16px',
                    borderRadius: '8px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: SF,
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#ffffff',
                    backgroundColor: isPending ? '#0058b3' : '#0071E3',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 20px',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.8 : 1,
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isPending ? 'Vinculando...' : 'Vincular cuenta'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main button component ─────────────────────────────────────────────────────

export function LinkClientButton({ clientId, clientName, currentProfileId }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [isPendingUnlink, startUnlinkTransition] = useTransition()
  const [linked, setLinked] = useState(currentProfileId !== null)
  const [unlinkError, setUnlinkError] = useState<string | null>(null)

  function handleUnlink() {
    if (!confirm(`Quitar acceso al portal de "${clientName}"?`)) return
    setUnlinkError(null)
    startUnlinkTransition(async () => {
      const result = await unlinkClientFromUser(clientId)
      if (result.error) { setUnlinkError(result.error); return }
      setLinked(false)
    })
  }

  if (linked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          type="button"
          onClick={handleUnlink}
          disabled={isPendingUnlink}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: SF,
            fontSize: '13px',
            fontWeight: 500,
            color: '#FF453A',
            backgroundColor: 'rgba(255,69,58,0.08)',
            border: '1px solid rgba(255,69,58,0.2)',
            borderRadius: '8px',
            padding: '7px 14px',
            cursor: isPendingUnlink ? 'not-allowed' : 'pointer',
            opacity: isPendingUnlink ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          {isPendingUnlink
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Link2Off className="w-3.5 h-3.5" strokeWidth={2} />}
          {isPendingUnlink ? 'Quitando acceso...' : 'Quitar acceso'}
        </button>
        {unlinkError && (
          <p style={{ fontFamily: SF, fontSize: '12px', color: '#FF453A' }}>{unlinkError}</p>
        )}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: SF,
          fontSize: '13px',
          fontWeight: 500,
          color: '#0071E3',
          backgroundColor: 'rgba(0,113,227,0.08)',
          border: '1px solid rgba(0,113,227,0.2)',
          borderRadius: '8px',
          padding: '7px 14px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <Link2 className="w-3.5 h-3.5" strokeWidth={2} />
        Vincular cuenta
      </button>

      {modalOpen && (
        <LinkModal
          clientId={clientId}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setLinked(true); setModalOpen(false) }}
        />
      )}
    </>
  )
}
