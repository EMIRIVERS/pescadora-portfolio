'use client'

import React, { useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const cancelBtnRef  = useRef<HTMLButtonElement>(null)
  const overlayRef    = useRef<HTMLDivElement>(null)

  // Focus the cancel button on open (safer default for destructive actions)
  useEffect(() => {
    if (isOpen) {
      cancelBtnRef.current?.focus()
    }
  }, [isOpen])

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onCancel()

      // Basic focus trap between the two buttons
      if (e.key === 'Tab') {
        const focusable = [cancelBtnRef.current, confirmBtnRef.current].filter(
          Boolean,
        ) as HTMLButtonElement[]
        if (focusable.length < 2) return
        const first = focusable[0]
        const last  = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    },
    [isOpen, onCancel],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen) return null

  const confirmColor = danger ? 'var(--dash-danger)' : 'var(--dash-accent)'

  return (
    <>
      <style>{`
        @keyframes modal-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-panel-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>

      {/* Overlay */}
      <div
        ref={overlayRef}
        role="presentation"
        onClick={onCancel}
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          10000,
          background:      'rgba(0,0,0,0.6)',
          backdropFilter:  'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '24px',
          animation:       'modal-overlay-in 0.2s ease forwards',
        }}
      >
        {/* Panel — stop propagation so clicks inside don't close */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby={description ? 'confirm-modal-desc' : undefined}
          onClick={(e) => e.stopPropagation()}
          style={{
            background:   'var(--dash-surface-2)',
            borderRadius: '16px',
            border:       '1px solid var(--dash-border)',
            maxWidth:     '400px',
            width:        '100%',
            padding:      '28px 28px 24px',
            boxShadow:    '0 24px 64px rgba(0,0,0,0.7)',
            animation:    'modal-panel-in 0.22s cubic-bezier(0,0,0.2,1) forwards',
            fontFamily:
              "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
        >
          {/* Title */}
          <h2
            id="confirm-modal-title"
            style={{
              margin:     0,
              fontSize:   '17px',
              fontWeight: 600,
              color:      'var(--dash-text-primary)',
              lineHeight: '1.3',
            }}
          >
            {title}
          </h2>

          {/* Description */}
          {description && (
            <p
              id="confirm-modal-desc"
              style={{
                margin:     '10px 0 0',
                fontSize:   '14px',
                color:      'var(--dash-text-secondary)',
                lineHeight: '1.5',
              }}
            >
              {description}
            </p>
          )}

          {/* Actions */}
          <div
            style={{
              display:        'flex',
              justifyContent: 'flex-end',
              gap:            '10px',
              marginTop:      '24px',
            }}
          >
            {/* Cancel */}
            <button
              ref={cancelBtnRef}
              onClick={onCancel}
              style={{
                padding:      '9px 18px',
                borderRadius: '10px',
                border:       '1px solid var(--dash-border-strong)',
                background:   'var(--dash-border)',
                color:        'var(--dash-text-primary)',
                fontSize:     '14px',
                fontWeight:   500,
                cursor:       'pointer',
                transition:   'background 0.15s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  'var(--dash-surface-3)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  'var(--dash-border)')
              }
            >
              {cancelLabel}
            </button>

            {/* Confirm */}
            <button
              ref={confirmBtnRef}
              onClick={onConfirm}
              style={{
                padding:      '9px 18px',
                borderRadius: '10px',
                border:       'none',
                background:   confirmColor,
                color:        '#FFFFFF',
                fontSize:     '14px',
                fontWeight:   600,
                cursor:       'pointer',
                transition:   'opacity 0.15s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.opacity = '1')
              }
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
