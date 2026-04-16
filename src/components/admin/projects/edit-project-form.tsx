'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProjectWithClient, Client, ProjectStatus } from '@/lib/supabase/types'
import { Loader2 } from 'lucide-react'

interface Props {
  project: ProjectWithClient
  clients: Pick<Client, 'id' | 'name' | 'company'>[]
}

interface FormValues {
  title: string
  description: string
  client_id: string
  status: ProjectStatus
  start_date: string
  end_date: string
  is_public: boolean
  portfolio_order: number
  cover_url: string
  budget: string
  currency: string
  internal_notes: string
}

interface FormErrors {
  title?: string
  end_date?: string
  portfolio_order?: string
  general?: string
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'pre_production', label: 'Pre-produccion' },
  { value: 'production', label: 'Produccion' },
  { value: 'post_production', label: 'Post-produccion' },
  { value: 'delivered', label: 'Entregado' },
]

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.title.trim()) {
    errors.title = 'El titulo es obligatorio.'
  }

  if (values.start_date && values.end_date) {
    const start = new Date(values.start_date)
    const end = new Date(values.end_date)
    if (end <= start) {
      errors.end_date = 'La fecha de cierre debe ser posterior a la de inicio.'
    }
  }

  if (values.is_public && !Number.isInteger(values.portfolio_order)) {
    errors.portfolio_order = 'El orden debe ser un numero entero.'
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

const inputDisabled: React.CSSProperties = {
  opacity: 0.45,
  cursor: 'not-allowed',
}

export function EditProjectForm({ project, clients }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FormErrors>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>({
    title: project.title,
    description: project.description ?? '',
    client_id: project.client_id ?? '',
    status: project.status,
    start_date: project.start_date ?? '',
    end_date: project.end_date ?? '',
    is_public: project.is_public,
    portfolio_order: project.portfolio_order,
    cover_url: project.cover_url ?? '',
    budget: (project as ProjectWithClient & { budget?: number | null }).budget != null ? String((project as ProjectWithClient & { budget?: number | null }).budget) : '',
    currency: (project as ProjectWithClient & { currency?: string | null }).currency ?? 'MXN',
    internal_notes: (project as ProjectWithClient & { internal_notes?: string | null }).internal_notes ?? '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ?? false) : value,
    }))
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

      const { error } = await supabase
        .from('projects')
        .update({
          title: values.title.trim(),
          description: values.description.trim() || null,
          client_id: values.client_id || null,
          status: values.status,
          start_date: values.start_date || null,
          end_date: values.end_date || null,
          cover_url: values.cover_url.trim() || null,
          budget: values.budget ? parseFloat(values.budget) : null,
          currency: values.currency || 'MXN',
          internal_notes: values.internal_notes.trim() || null,
          is_public: values.is_public,
          portfolio_order: values.portfolio_order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id)

      if (error) {
        setErrors({ general: error.message })
        return
      }

      router.refresh()
      router.push(`/admin/projects/${project.id}`)
    })
  }

  function getInputStyle(fieldName: string, extra?: React.CSSProperties): React.CSSProperties {
    return {
      ...inputBase,
      ...(isPending ? inputDisabled : {}),
      ...(focusedField === fieldName ? { border: '1px solid #0071E3', boxShadow: '0 0 0 3px rgba(0,113,227,0.15)' } : {}),
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
            color: '#FF453A',
          }}
        >
          {errors.general}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" style={fieldLabel}>
          Titulo <span style={{ color: '#FF453A' }}>*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={values.title}
          onChange={handleChange}
          disabled={isPending}
          placeholder="Titulo del proyecto"
          onFocus={() => setFocusedField('title')}
          onBlur={() => setFocusedField(null)}
          style={getInputStyle('title')}
        />
        {errors.title && (
          <p style={{ fontSize: '12px', color: '#FF453A', marginTop: '5px' }}>{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" style={fieldLabel}>
          Descripcion
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={values.description}
          onChange={handleChange}
          disabled={isPending}
          placeholder="Breve descripcion del proyecto..."
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
            <p style={{ fontSize: '12px', color: '#FF453A', marginTop: '5px' }}>{errors.end_date}</p>
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
            <option value="USD">USD — Dolar</option>
          </select>
        </div>
      </div>

      {/* Notas internas */}
      <div>
        <label htmlFor="internal_notes" style={fieldLabel}>
          Notas internas
        </label>
        <textarea
          id="internal_notes"
          name="internal_notes"
          rows={4}
          value={values.internal_notes}
          onChange={handleChange}
          disabled={isPending}
          placeholder="Solo visible para el equipo..."
          onFocus={() => setFocusedField('internal_notes')}
          onBlur={() => setFocusedField(null)}
          style={{
            ...getInputStyle('internal_notes'),
            resize: 'none',
            minHeight: '100px',
          }}
        />
      </div>

      {/* Cover URL */}
      <div>
        <label htmlFor="cover_url" style={fieldLabel}>
          URL de portada
        </label>
        <input
          id="cover_url"
          name="cover_url"
          type="url"
          value={values.cover_url}
          onChange={handleChange}
          disabled={isPending}
          placeholder="https://..."
          onFocus={() => setFocusedField('cover_url')}
          onBlur={() => setFocusedField(null)}
          style={getInputStyle('cover_url')}
        />
        <p style={{ fontSize: '12px', color: '#48484A', marginTop: '5px' }}>
          Se usa como imagen en la tarjeta del portfolio publico.
        </p>
      </div>

      {/* Portfolio visibility */}
      <div
        style={{
          backgroundColor: '#1C1C1E',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '18px 20px',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#48484A',
            marginBottom: '14px',
          }}
        >
          Visibilidad en portfolio
        </p>

        <label className="flex items-center gap-3 cursor-pointer" style={{ userSelect: 'none' }}>
          <input
            id="is_public"
            name="is_public"
            type="checkbox"
            checked={values.is_public}
            onChange={handleChange}
            disabled={isPending}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              accentColor: '#0071E3',
              cursor: isPending ? 'not-allowed' : 'pointer',
            }}
          />
          <span style={{ fontSize: '14px', color: '#F5F5F7' }}>
            Mostrar en el portfolio publico
          </span>
        </label>

        {values.is_public && (
          <div style={{ marginTop: '16px' }}>
            <label htmlFor="portfolio_order" style={fieldLabel}>
              Orden en portfolio
            </label>
            <input
              id="portfolio_order"
              name="portfolio_order"
              type="number"
              min={0}
              step={1}
              value={values.portfolio_order}
              onChange={(e) => {
                setValues((prev) => ({
                  ...prev,
                  portfolio_order: parseInt(e.target.value, 10) || 0,
                }))
                if ('portfolio_order' in errors) {
                  setErrors((prev) => ({ ...prev, portfolio_order: undefined }))
                }
              }}
              disabled={isPending}
              onFocus={() => setFocusedField('portfolio_order')}
              onBlur={() => setFocusedField(null)}
              style={{
                ...getInputStyle('portfolio_order'),
                width: '120px',
              }}
            />
            <p style={{ fontSize: '12px', color: '#48484A', marginTop: '5px' }}>
              Los numeros menores aparecen primero.
            </p>
            {errors.portfolio_order && (
              <p style={{ fontSize: '12px', color: '#FF453A', marginTop: '5px' }}>{errors.portfolio_order}</p>
            )}
          </div>
        )}
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
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#86868B',
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
            backgroundColor: '#0071E3',
            border: 'none',
            color: '#FFFFFF',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.65 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Guardar cambios
        </button>
      </div>
    </form>
  )
}
