'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Client, ProjectStatus } from '@/lib/supabase/types'
import { Loader2 } from 'lucide-react'

interface Props {
  clients: Pick<Client, 'id' | 'name' | 'company'>[]
}

interface FormValues {
  title: string
  description: string
  client_id: string
  status: ProjectStatus
  start_date: string
  end_date: string
  budget: string
  currency: string
}

interface FormErrors {
  title?: string
  end_date?: string
  general?: string
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'pre_production', label: 'Pre-producción' },
  { value: 'production', label: 'Producción' },
  { value: 'post_production', label: 'Post-producción' },
  { value: 'delivered', label: 'Entregado' },
]

const DEFAULT_VALUES: FormValues = {
  title: '',
  description: '',
  client_id: '',
  status: 'pre_production',
  start_date: '',
  end_date: '',
  budget: '',
  currency: 'MXN',
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.title.trim()) {
    errors.title = 'El título es obligatorio.'
  }

  if (values.start_date && values.end_date) {
    const start = new Date(values.start_date)
    const end = new Date(values.end_date)
    if (end <= start) {
      errors.end_date = 'La fecha de cierre debe ser posterior a la de inicio.'
    }
  }

  return errors
}

// Shared style helpers
const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--dash-text-secondary)',
  marginBottom: '6px',
}

const inputBase: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--dash-surface-2)',
  border: '1px solid var(--dash-border-strong)',
  borderRadius: '8px',
  padding: '10px 14px',
  color: 'var(--dash-text-primary)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

const inputDisabled: React.CSSProperties = {
  opacity: 0.45,
  cursor: 'not-allowed',
}

export function NewProjectForm({ clients }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FormErrors>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
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

      const { data, error } = await supabase
        .from('projects')
        .insert({
          title: values.title.trim(),
          description: values.description.trim() || null,
          client_id: values.client_id || null,
          status: values.status,
          start_date: values.start_date || null,
          end_date: values.end_date || null,
          budget: values.budget ? parseFloat(values.budget) : null,
          currency: values.currency || 'MXN',
        })
        .select('id')
        .single()

      if (error || !data) {
        setErrors({ general: error?.message ?? 'No se pudo crear el proyecto.' })
        return
      }

      router.push(`/admin/projects/${data.id}`)
    })
  }

  function getInputStyle(fieldName: string, extra?: React.CSSProperties): React.CSSProperties {
    return {
      ...inputBase,
      ...(isPending ? inputDisabled : {}),
      ...(focusedField === fieldName ? { border: '1px solid var(--dash-accent)', boxShadow: '0 0 0 3px rgba(var(--dash-accent-rgb),0.15)' } : {}),
      ...extra,
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {errors.general && (
        <div
          style={{
            backgroundColor: 'rgba(255,69,58,0.1)',
            border: '1px solid rgba(255,69,58,0.25)',
            borderRadius: '8px',
            padding: '12px 14px',
            fontSize: '13px',
            color: 'var(--dash-danger)',
          }}
        >
          {errors.general}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" style={fieldLabel}>
          Título <span style={{ color: 'var(--dash-danger)' }}>*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={values.title}
          onChange={handleChange}
          disabled={isPending}
          placeholder="Título del proyecto"
          onFocus={() => setFocusedField('title')}
          onBlur={() => setFocusedField(null)}
          style={getInputStyle('title')}
        />
        {errors.title && (
          <p style={{ fontSize: '12px', color: 'var(--dash-danger)', marginTop: '5px' }}>{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" style={fieldLabel}>
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={values.description}
          onChange={handleChange}
          disabled={isPending}
          placeholder="Breve descripción del proyecto..."
          onFocus={() => setFocusedField('description')}
          onBlur={() => setFocusedField(null)}
          style={{
            ...getInputStyle('description'),
            resize: 'none',
            minHeight: '100px',
          }}
        />
      </div>

      {/* Client + Status grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="client_id" style={fieldLabel}>
            Cliente
          </label>
          <select
            id="client_id"
            name="client_id"
            value={values.client_id}
            onChange={handleChange}
            disabled={isPending}
            onFocus={() => setFocusedField('client_id')}
            onBlur={() => setFocusedField(null)}
            style={getInputStyle('client_id')}
          >
            <option value="">Sin cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` · ${c.company}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" style={fieldLabel}>
            Estado
          </label>
          <select
            id="status"
            name="status"
            value={values.status}
            onChange={handleChange}
            disabled={isPending}
            onFocus={() => setFocusedField('status')}
            onBlur={() => setFocusedField(null)}
            style={getInputStyle('status')}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" style={fieldLabel}>
            Fecha de inicio
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            value={values.start_date}
            onChange={handleChange}
            disabled={isPending}
            onFocus={() => setFocusedField('start_date')}
            onBlur={() => setFocusedField(null)}
            style={{ ...getInputStyle('start_date'), colorScheme: 'dark' }}
          />
        </div>
        <div>
          <label htmlFor="end_date" style={fieldLabel}>
            Fecha de cierre
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            value={values.end_date}
            onChange={handleChange}
            disabled={isPending}
            onFocus={() => setFocusedField('end_date')}
            onBlur={() => setFocusedField(null)}
            style={{ ...getInputStyle('end_date'), colorScheme: 'dark' }}
          />
          {errors.end_date && (
            <p style={{ fontSize: '12px', color: 'var(--dash-danger)', marginTop: '5px' }}>{errors.end_date}</p>
          )}
        </div>
      </div>

      {/* Presupuesto */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="budget" style={fieldLabel}>
            Presupuesto
          </label>
          <input
            id="budget"
            name="budget"
            type="number"
            min="0"
            step="100"
            value={values.budget}
            onChange={handleChange}
            disabled={isPending}
            placeholder="0.00"
            onFocus={() => setFocusedField('budget')}
            onBlur={() => setFocusedField(null)}
            style={getInputStyle('budget')}
          />
        </div>
        <div>
          <label htmlFor="currency" style={fieldLabel}>
            Moneda
          </label>
          <select
            id="currency"
            name="currency"
            value={values.currency}
            onChange={handleChange}
            disabled={isPending}
            onFocus={() => setFocusedField('currency')}
            onBlur={() => setFocusedField(null)}
            style={getInputStyle('currency')}
          >
            <option value="MXN">MXN — Peso mexicano</option>
            <option value="USD">USD — Dólar</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: '1px solid var(--dash-border-strong)',
            color: 'var(--dash-text-secondary)',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.45 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2"
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: '8px',
            backgroundColor: 'var(--dash-accent)',
            border: 'none',
            color: '#FFFFFF',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.65 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Crear proyecto
        </button>
      </div>
    </form>
  )
}
