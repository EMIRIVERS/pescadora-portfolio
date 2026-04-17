'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { inviteClientByEmail, createClient } from '../../../../app/actions/clients'

interface Props {
  onClose: () => void
}

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

type Tab = 'invite' | 'manual'

// ── Shared field component ────────────────────────────────────────────────────

interface FieldProps {
  id: string
  label: string
  required?: boolean
  name: string
  type?: string
  value: string
  placeholder: string
  disabled: boolean
  error?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function Field({ id, label, required, name, type = 'text', value, placeholder, disabled, error, onChange }: FieldProps) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label
        htmlFor={id}
        style={{ fontFamily: SF, fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-secondary)', letterSpacing: '0.01em' }}
      >
        {label}
        {required && <span style={{ color: 'var(--dash-danger)', marginLeft: '3px' }}>*</span>}
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
          opacity: disabled ? 0.5 : 1,
          boxShadow: focused ? '0 0 0 3px rgba(0,113,227,0.12)' : 'none',
          boxSizing: 'border-box',
        }}
      />
      {error && (
        <p style={{ fontFamily: SF, fontSize: '12px', color: 'var(--dash-danger)', margin: 0 }}>{error}</p>
      )}
    </div>
  )
}

// ── Tab button ────────────────────────────────────────────────────────────────

interface TabBtnProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function TabBtn({ active, onClick, children }: TabBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        fontFamily: SF,
        fontSize: '14px',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--dash-text-primary)' : 'var(--dash-text-secondary)',
        backgroundColor: active ? 'var(--dash-surface-2)' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #0071E3' : '2px solid transparent',
        padding: '10px 0',
        cursor: 'pointer',
        transition: 'color 0.15s ease, border-color 0.15s ease',
        outline: 'none',
      }}
    >
      {children}
    </button>
  )
}

// ── Invite tab ────────────────────────────────────────────────────────────────

function InviteTab({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) { setError('El email es obligatorio.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError('Introduce una direccion de email valida.'); return }
    setError(null)

    startTransition(async () => {
      const result = await inviteClientByEmail(trimmed)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
            padding: '28px 20px',
            backgroundColor: 'rgba(52,199,89,0.08)',
            border: '1px solid rgba(52,199,89,0.2)',
            borderRadius: '12px', textAlign: 'center',
          }}
        >
          <CheckCircle2 style={{ color: '#34C759', width: '32px', height: '32px' }} strokeWidth={1.5} />
          <div>
            <p style={{ fontFamily: SF, fontSize: '15px', fontWeight: 600, color: 'var(--dash-text-primary)', marginBottom: '4px' }}>
              Invitacion enviada
            </p>
            <p style={{ fontFamily: SF, fontSize: '13px', color: 'var(--dash-text-secondary)' }}>{email.trim()}</p>
            <p style={{ fontFamily: SF, fontSize: '13px', color: 'var(--dash-text-tertiary)', marginTop: '6px' }}>
              El cliente recibira un enlace para acceder al portal.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ fontFamily: SF, fontSize: '15px', fontWeight: 500, color: '#0071E3', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 16px' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ fontFamily: SF, fontSize: '13px', color: 'var(--dash-text-secondary)', margin: 0 }}>
        Se enviara un email de invitacion de Supabase Auth. El cliente podra crear su cuenta y acceder al portal.
      </p>
      <Field
        id="inv-email"
        label="Email"
        required
        name="email"
        type="email"
        value={email}
        placeholder="cliente@ejemplo.com"
        disabled={isPending}
        error={error ?? undefined}
        onChange={(e) => { setEmail(e.target.value); setError(null) }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          style={{
            fontFamily: SF, fontSize: '15px', fontWeight: 500, color: 'var(--dash-text-secondary)',
            backgroundColor: 'transparent', border: 'none',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.5 : 1, padding: '8px 16px', borderRadius: '8px',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontFamily: SF, fontSize: '15px', fontWeight: 500, color: '#ffffff',
            backgroundColor: isPending ? '#0058b3' : '#0071E3',
            border: 'none', borderRadius: '8px', padding: '9px 20px',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.8 : 1, transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = '#0077ED' }}
          onMouseLeave={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = '#0071E3' }}
        >
          {isPending && <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />}
          {isPending ? 'Enviando...' : 'Enviar invitacion'}
        </button>
      </div>
    </form>
  )
}

// ── Manual tab ────────────────────────────────────────────────────────────────

interface ManualValues {
  name: string
  email: string
  company: string
  phone: string
}

const MANUAL_DEFAULT: ManualValues = { name: '', email: '', company: '', phone: '' }

function ManualTab({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [values, setValues] = useState<ManualValues>(MANUAL_DEFAULT)
  const [errors, setErrors] = useState<Partial<ManualValues & { general: string }>>({})
  const [success, setSuccess] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.name.trim()) { setErrors({ name: 'El nombre es obligatorio.' }); return }
    setErrors({})

    startTransition(async () => {
      const fd = new FormData()
      fd.set('name', values.name)
      fd.set('email', values.email)
      fd.set('company', values.company)
      fd.set('phone', values.phone)
      const result = await createClient(fd)
      if (result.error) {
        setErrors({ general: result.error })
      } else {
        setSuccess(true)
        setTimeout(onClose, 1800)
      }
    })
  }

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '28px 20px', backgroundColor: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)', borderRadius: '12px', textAlign: 'center' }}>
        <CheckCircle2 style={{ color: '#34C759', width: '32px', height: '32px' }} strokeWidth={1.5} />
        <p style={{ fontFamily: SF, fontSize: '15px', fontWeight: 600, color: 'var(--dash-text-primary)', margin: 0 }}>
          Cliente guardado
        </p>
        <p style={{ fontFamily: SF, fontSize: '13px', color: 'var(--dash-text-secondary)', margin: 0 }}>
          {values.name.trim()} fue agregado sin cuenta de acceso.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontFamily: SF, fontSize: '13px', color: 'var(--dash-text-secondary)', margin: 0 }}>
        Crea el registro del cliente directamente. El campo <code style={{ color: 'var(--dash-text-tertiary)' }}>profile_id</code> quedara vacio hasta que el cliente acepte una invitacion.
      </p>

      {errors.general && (
        <div style={{ backgroundColor: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: '10px', padding: '12px 14px', fontFamily: SF, fontSize: '13px', color: 'var(--dash-danger)' }}>
          {errors.general}
        </div>
      )}

      <Field id="mn-name" label="Nombre" required name="name" value={values.name} placeholder="Ana Garcia" disabled={isPending} error={errors.name} onChange={handleChange} />
      <Field id="mn-email" label="Email" name="email" type="email" value={values.email} placeholder="Opcional" disabled={isPending} error={errors.email} onChange={handleChange} />
      <Field id="mn-company" label="Empresa" name="company" value={values.company} placeholder="Opcional" disabled={isPending} onChange={handleChange} />
      <Field id="mn-phone" label="Telefono" name="phone" value={values.phone} placeholder="Opcional" disabled={isPending} onChange={handleChange} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          style={{ fontFamily: SF, fontSize: '15px', fontWeight: 500, color: 'var(--dash-text-secondary)', backgroundColor: 'transparent', border: 'none', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.5 : 1, padding: '8px 16px', borderRadius: '8px' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontFamily: SF, fontSize: '15px', fontWeight: 500, color: '#ffffff',
            backgroundColor: isPending ? '#0058b3' : '#0071E3',
            border: 'none', borderRadius: '8px', padding: '9px 20px',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.8 : 1, transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = '#0077ED' }}
          onMouseLeave={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = '#0071E3' }}
        >
          {isPending && <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />}
          {isPending ? 'Guardando...' : 'Guardar cliente'}
        </button>
      </div>
    </form>
  )
}

// ── Main modal export (used by InviteClientButton) ────────────────────────────

export function InviteClientModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('invite')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose()
  }

  const TITLE: Record<Tab, string> = {
    invite: 'Nuevo cliente',
    manual: 'Nuevo cliente',
  }

  return (
    <AnimatePresence>
    <motion.div
      ref={overlayRef}
      onClick={handleOverlayClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '16px',
      }}
      aria-modal="true"
      role="dialog"
      aria-label="Nuevo cliente"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'relative', width: '100%', maxWidth: '460px',
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
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <h2 style={{ fontFamily: SF, fontSize: '17px', fontWeight: 600, color: 'var(--dash-text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            {TITLE[tab]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: '50%',
              border: 'none', backgroundColor: 'var(--dash-border)',
              color: 'var(--dash-text-secondary)', cursor: 'pointer', flexShrink: 0,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--dash-border-strong)'; e.currentTarget.style.color = 'var(--dash-text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--dash-border)'; e.currentTarget.style.color = 'var(--dash-text-secondary)' }}
          >
            <X style={{ width: '14px', height: '14px' }} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backgroundColor: 'var(--dash-surface-1)',
          }}
        >
          <TabBtn active={tab === 'invite'} onClick={() => setTab('invite')}>
            Invitar por email
          </TabBtn>
          <TabBtn active={tab === 'manual'} onClick={() => setTab('manual')}>
            Guardar manualmente
          </TabBtn>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {tab === 'invite' ? (
            <InviteTab onClose={onClose} />
          ) : (
            <ManualTab onClose={onClose} />
          )}
        </div>
      </motion.div>
    </motion.div>
    </AnimatePresence>
  )
}
