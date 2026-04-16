'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { updateClient, deleteClient } from '../../../../../actions/clients'

interface Props {
  id: string
  initialName: string
  initialEmail: string
  initialCompany: string
}

// ── Style helpers ──────────────────────────────────────────────────────────────

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#86868B',
  marginBottom: '6px',
}

const inputBase: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#1C1C1E',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '10px 14px',
  color: '#F5F5F7',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditClientForm({ id, initialName, initialEmail, initialCompany }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [company, setCompany] = useState(initialCompany)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  function getInputStyle(fieldName: string): React.CSSProperties {
    return {
      ...inputBase,
      ...(isPending || isDeleting ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
      ...(focusedField === fieldName
        ? { border: '1px solid #0071E3', boxShadow: '0 0 0 3px rgba(0,113,227,0.15)' }
        : {}),
    }
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setNameError(null)
    setGeneralError(null)

    if (!name.trim()) {
      setNameError('El nombre es obligatorio.')
      return
    }

    const formData = new FormData()
    formData.set('name', name)
    formData.set('email', email)
    formData.set('company', company)

    startTransition(async () => {
      const result = await updateClient(id, formData)
      if (result.error) {
        setGeneralError(result.error)
        return
      }
      router.push(`/admin/clients`)
    })
  }

  function handleDelete() {
    if (!confirm('Eliminar este cliente? Esta accion no se puede deshacer.')) return
    startDeleteTransition(async () => {
      const result = await deleteClient(id)
      if (result.error) {
        setGeneralError(result.error)
        return
      }
      router.push('/admin/clients')
    })
  }

  const isBusy = isPending || isDeleting

  return (
    <form onSubmit={handleSave} noValidate className="space-y-6">
      {/* General error */}
      {generalError && (
        <div
          style={{
            backgroundColor: 'rgba(255,69,58,0.1)',
            border: '1px solid rgba(255,69,58,0.25)',
            borderRadius: '8px',
            padding: '12px 14px',
            fontSize: '13px',
            color: '#FF453A',
          }}
        >
          {generalError}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" style={fieldLabel}>
          Nombre <span style={{ color: '#FF453A' }}>*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (nameError) setNameError(null)
          }}
          disabled={isBusy}
          placeholder="Nombre del cliente"
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
          style={getInputStyle('name')}
        />
        {nameError && (
          <p style={{ fontSize: '12px', color: '#FF453A', marginTop: '5px' }}>{nameError}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" style={fieldLabel}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isBusy}
          placeholder="correo@ejemplo.com"
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          style={getInputStyle('email')}
        />
      </div>

      {/* Company */}
      <div>
        <label htmlFor="company" style={fieldLabel}>
          Empresa
        </label>
        <input
          id="company"
          name="company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          disabled={isBusy}
          placeholder="Nombre de la empresa"
          onFocus={() => setFocusedField('company')}
          onBlur={() => setFocusedField(null)}
          style={getInputStyle('company')}
        />
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          gap: '12px',
        }}
      >
        {/* Delete */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isBusy}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: '8px',
            backgroundColor: 'rgba(255,69,58,0.1)',
            border: '1px solid rgba(255,69,58,0.25)',
            color: '#FF453A',
            cursor: isBusy ? 'not-allowed' : 'pointer',
            opacity: isBusy ? 0.45 : 1,
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Eliminar cliente
        </button>

        {/* Right side: Cancel + Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => router.push(`/admin/clients`)}
            disabled={isBusy}
            style={{
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#86868B',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              opacity: isBusy ? 0.45 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isBusy}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '8px',
              backgroundColor: '#0071E3',
              border: 'none',
              color: '#FFFFFF',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              opacity: isBusy ? 0.65 : 1,
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </form>
  )
}
