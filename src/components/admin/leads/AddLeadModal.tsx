'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createLead } from '@/lib/actions/leads'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
type LeadSource = 'manual' | 'referral' | 'instagram' | 'web' | 'whatsapp' | 'other'

interface Lead {
  id: string
  created_at: string
  updated_at: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: LeadStatus
  source: LeadSource
  notes: string | null
  wa_message: string | null
  budget_range: string | null
  project_type: string | null
  assigned_to: string | null
  last_contacted_at: string | null
  expected_close_date: string | null
  converted_to_client_id: string | null
}

interface Props {
  onClose: () => void
  onCreated: (lead: Lead) => void
  defaultStatus?: LeadStatus
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  proposal: 'Propuesta',
  won: 'Ganado',
  lost: 'Perdido',
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--dash-text-secondary)',
  marginBottom: '6px',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--dash-surface-2)',
  border: '1px solid var(--dash-border-strong)',
  borderRadius: '8px',
  padding: '10px 14px',
  color: 'var(--dash-text-primary)',
  fontSize: '14px',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer',
}

export default function AddLeadModal({ onClose, onCreated, defaultStatus = 'new' }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const form = e.currentTarget
      const formData = new FormData(form)
      const result = await createLead(formData)

      if (result.lead) {
        onCreated(result.lead as Lead)
        onClose()
      } else if (result.error) {
        setError(result.error as string)
      }
    } catch {
      setError('Ocurrio un error inesperado.')
    } finally {
      setSubmitting(false)
    }
  }

  function getFocusStyle(fieldId: string): React.CSSProperties {
    return focusedField === fieldId
      ? { ...inputStyle, borderColor: '#0071E3' }
      : inputStyle
  }

  function getFocusStyleSelect(fieldId: string): React.CSSProperties {
    return focusedField === fieldId
      ? { ...selectStyle, borderColor: '#0071E3' }
      : selectStyle
  }

  return (
    <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        style={{
          width: '520px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: '90vh',
          background: 'var(--dash-surface-1)',
          borderRadius: '20px',
          border: '1px solid var(--dash-border-strong)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 28px',
            borderBottom: '1px solid var(--dash-border)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--dash-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            Nuevo Lead
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--dash-surface-2)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--dash-text-secondary)',
              fontSize: '16px',
              lineHeight: 1,
              transition: 'background 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--dash-surface-3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--dash-surface-2)'
            }}
            aria-label="Cerrar modal"
          >
            x
          </button>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          style={{
            overflowY: 'auto',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: 1,
          }}
        >
          {/* Nombre + Empresa — grid 2 col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="add-name" style={fieldLabel}>
                Nombre <span style={{ color: 'var(--dash-danger)' }}>*</span>
              </label>
              <input
                id="add-name"
                name="name"
                type="text"
                required
                placeholder="Juan Garcia"
                style={getFocusStyle('add-name')}
                onFocus={() => setFocusedField('add-name')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div>
              <label htmlFor="add-company" style={fieldLabel}>
                Empresa
              </label>
              <input
                id="add-company"
                name="company"
                type="text"
                placeholder="Nombre de la empresa"
                style={getFocusStyle('add-company')}
                onFocus={() => setFocusedField('add-company')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          </div>

          {/* Email + Telefono */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="add-email" style={fieldLabel}>
                Email
              </label>
              <input
                id="add-email"
                name="email"
                type="email"
                placeholder="juan@ejemplo.com"
                style={getFocusStyle('add-email')}
                onFocus={() => setFocusedField('add-email')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div>
              <label htmlFor="add-phone" style={fieldLabel}>
                Telefono
              </label>
              <input
                id="add-phone"
                name="phone"
                type="tel"
                placeholder="+54 9 11 0000-0000"
                style={getFocusStyle('add-phone')}
                onFocus={() => setFocusedField('add-phone')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          </div>

          {/* Estado inicial + Fuente */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="add-status" style={fieldLabel}>
                Estado inicial
              </label>
              <select
                id="add-status"
                name="status"
                defaultValue={defaultStatus}
                style={getFocusStyleSelect('add-status')}
                onFocus={() => setFocusedField('add-status')}
                onBlur={() => setFocusedField(null)}
              >
                {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="add-source" style={fieldLabel}>
                Fuente
              </label>
              <select
                id="add-source"
                name="source"
                defaultValue="manual"
                style={getFocusStyleSelect('add-source')}
                onFocus={() => setFocusedField('add-source')}
                onBlur={() => setFocusedField(null)}
              >
                <option value="web">Web</option>
                <option value="referral">Referido</option>
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="manual">Manual</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>

          {/* Tipo de proyecto + Presupuesto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="add-project-type" style={fieldLabel}>
                Tipo de proyecto
              </label>
              <input
                id="add-project-type"
                name="project_type"
                type="text"
                placeholder="Videoclip, Boda, Corporativo..."
                style={getFocusStyle('add-project-type')}
                onFocus={() => setFocusedField('add-project-type')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div>
              <label htmlFor="add-budget" style={fieldLabel}>
                Presupuesto
              </label>
              <select
                id="add-budget"
                name="budget_range"
                defaultValue=""
                style={getFocusStyleSelect('add-budget')}
                onFocus={() => setFocusedField('add-budget')}
                onBlur={() => setFocusedField(null)}
              >
                <option value="" disabled>
                  Seleccionar...
                </option>
                <option value="< $5k">&lt; $5k</option>
                <option value="$5k-$15k">$5k - $15k</option>
                <option value="$15k-$30k">$15k - $30k</option>
                <option value="$30k-$50k">$30k - $50k</option>
                <option value="$50k+">$50k+</option>
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label htmlFor="add-notes" style={fieldLabel}>
              Notas
            </label>
            <textarea
              id="add-notes"
              name="notes"
              placeholder="Detalles del proyecto, contexto..."
              style={{
                ...getFocusStyle('add-notes'),
                minHeight: '80px',
                resize: 'none',
                display: 'block',
              }}
              onFocus={() => setFocusedField('add-notes')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          {/* Error */}
          {error && (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--dash-danger)',
                margin: 0,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
              }}
            >
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '16px 28px',
            borderTop: '1px solid var(--dash-border)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              background: 'transparent',
              border: '1px solid var(--dash-border-strong)',
              borderRadius: '8px',
              color: 'var(--dash-text-secondary)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
              transition: 'border-color 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
              e.currentTarget.style.color = 'var(--dash-text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--dash-border)'
              e.currentTarget.style.color = 'var(--dash-text-secondary)'
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form={formRef.current?.id}
            disabled={submitting}
            onClick={() => formRef.current?.requestSubmit()}
            style={{
              padding: '9px 20px',
              background: submitting ? 'rgba(0,113,227,0.5)' : '#0071E3',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
              transition: 'background 0.15s ease',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => {
              if (!submitting) e.currentTarget.style.background = '#0077ED'
            }}
            onMouseLeave={(e) => {
              if (!submitting) e.currentTarget.style.background = '#0071E3'
            }}
          >
            {submitting ? 'Creando...' : 'Crear Lead'}
          </button>
        </div>
      </motion.div>
    </motion.div>
    </AnimatePresence>
  )
}
