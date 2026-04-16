'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { inviteClient } from '../../../../app/actions/invite-client'
import { X, Loader2, CheckCircle2 } from 'lucide-react'

interface Props {
  onClose: () => void
}

interface FormValues {
  name: string
  email: string
  company: string
}

interface FormErrors {
  name?: string
  email?: string
  general?: string
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.name.trim()) {
    errors.name = 'El nombre es obligatorio.'
  }

  if (!values.email.trim()) {
    errors.email = 'El email es obligatorio.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Introduce una direccion de email valida.'
  }

  return errors
}

const DEFAULT_VALUES: FormValues = {
  name: '',
  email: '',
  company: '',
}

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

interface LabeledFieldProps {
  id: string
  label: string
  required?: boolean
  name: keyof FormValues
  type: string
  value: string
  placeholder: string
  disabled: boolean
  error?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function LabeledField({
  id,
  label,
  required,
  name,
  type,
  value,
  placeholder,
  disabled,
  error,
  onChange,
}: LabeledFieldProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        style={{
          fontFamily: SF,
          fontSize: '12px',
          fontWeight: 500,
          color: '#86868B',
          letterSpacing: '0.01em',
        }}
      >
        {label}
        {required && (
          <span style={{ color: '#FF453A', marginLeft: '3px' }}>*</span>
        )}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete="off"
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          fontFamily: SF,
          fontSize: '15px',
          color: '#F5F5F7',
          backgroundColor: '#2C2C2E',
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
          opacity: disabled ? 0.5 : 1,
          boxShadow: focused ? '0 0 0 3px rgba(0,113,227,0.12)' : 'none',
        }}
      />
      {error && (
        <p
          style={{
            fontFamily: SF,
            fontSize: '12px',
            color: '#FF453A',
            marginTop: '2px',
          }}
        >
          {error}
        </p>
      )}
    </div>
  )
}

export function InviteClientModal({ onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FormErrors>({})
  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPending, onClose])

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current && !isPending) {
      onClose()
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validationErrors = validate(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})

    startTransition(async () => {
      const supabase = createClient()

      // 1. Insert the client record
      const { error: insertError } = await supabase
        .from('clients')
        .insert({
          name: values.name.trim(),
          email: values.email.trim(),
          company: values.company.trim() || null,
        })

      if (insertError) {
        setErrors({ general: insertError.message })
        return
      }

      // 2. Send magic link invite via server action (requires service role)
      const result = await inviteClient(values.email.trim())

      if (!result.success) {
        setErrors({ general: result.error ?? 'Failed to send invite.' })
        return
      }

      setSuccessEmail(values.email.trim())
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
      aria-label="Invitar cliente"
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#1C1C1E',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          boxShadow:
            '0 32px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
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
              color: '#F5F5F7',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Invitar cliente
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
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: '#86868B',
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.5 : 1,
              transition: 'background-color 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isPending) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)'
                e.currentTarget.style.color = '#F5F5F7'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.color = '#86868B'
            }}
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {successEmail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '28px 20px',
                  backgroundColor: 'rgba(52,199,89,0.08)',
                  border: '1px solid rgba(52,199,89,0.2)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <CheckCircle2
                  className="w-8 h-8"
                  style={{ color: '#34C759' }}
                  strokeWidth={1.5}
                />
                <div>
                  <p
                    style={{
                      fontFamily: SF,
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#F5F5F7',
                      marginBottom: '4px',
                    }}
                  >
                    Invitacion enviada
                  </p>
                  <p
                    style={{
                      fontFamily: SF,
                      fontSize: '13px',
                      color: '#86868B',
                    }}
                  >
                    {successEmail}
                  </p>
                  <p
                    style={{
                      fontFamily: SF,
                      fontSize: '13px',
                      color: '#48484A',
                      marginTop: '6px',
                    }}
                  >
                    El cliente recibira un enlace para acceder al portal.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    fontFamily: SF,
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#0071E3',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px 16px',
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {errors.general && (
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
                  {errors.general}
                </div>
              )}

              <LabeledField
                id="ic-name"
                label="Nombre"
                required
                name="name"
                type="text"
                value={values.name}
                placeholder="Ana Garcia"
                disabled={isPending}
                error={errors.name}
                onChange={handleChange}
              />

              <LabeledField
                id="ic-email"
                label="Email"
                required
                name="email"
                type="email"
                value={values.email}
                placeholder="ana@cliente.com"
                disabled={isPending}
                error={errors.email}
                onChange={handleChange}
              />

              <LabeledField
                id="ic-company"
                label="Empresa"
                name="company"
                type="text"
                value={values.company}
                placeholder="Opcional"
                disabled={isPending}
                onChange={handleChange}
              />

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  paddingTop: '4px',
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
                    color: '#86868B',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.5 : 1,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isPending) e.currentTarget.style.color = '#F5F5F7'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#86868B'
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
                  onMouseEnter={(e) => {
                    if (!isPending) e.currentTarget.style.backgroundColor = '#0077ED'
                  }}
                  onMouseLeave={(e) => {
                    if (!isPending) e.currentTarget.style.backgroundColor = '#0071E3'
                  }}
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isPending ? 'Enviando...' : 'Enviar invitacion'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
