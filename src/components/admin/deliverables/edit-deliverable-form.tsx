'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Deliverable, DeliverableType, DeliverableStatus } from '@/lib/supabase/types'
import { Loader2 } from 'lucide-react'

interface Props {
  deliverable: Deliverable
  onSuccess: (updated: Deliverable) => void
  onCancel: () => void
}

interface FormValues {
  title: string
  description: string
  url: string
  due_date: string
  type: DeliverableType
  status: DeliverableStatus
}

interface FormErrors {
  title?: string
  url?: string
  general?: string
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const S = {
  surface2:      '#1C1C1E',
  surface3:      '#2C2C2E',
  border:        'rgba(255,255,255,0.10)',
  textPrimary:   '#F5F5F7',
  textSecondary: '#86868B',
  textTertiary:  '#48484A',
  accent:        '#0071E3',
  accentRed:     '#FF453A',
  font:          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
} as const

// ─── Options ──────────────────────────────────────────────────────────────────
const TYPE_OPTIONS: { value: DeliverableType; label: string }[] = [
  { value: 'wip',   label: 'WIP' },
  { value: 'final', label: 'Final' },
]

const STATUS_OPTIONS: { value: DeliverableStatus; label: string }[] = [
  { value: 'pending',  label: 'Pendiente' },
  { value: 'review',   label: 'En revision' },
  { value: 'approved', label: 'Aprobado' },
]

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.title.trim()) {
    errors.title = 'El titulo es obligatorio.'
  }

  if (values.url.trim() && !/^https?:\/\/.+/.test(values.url.trim())) {
    errors.url = 'La URL debe comenzar con http:// o https://'
  }

  return errors
}

// ─── Shared field styles ──────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: S.surface2,
  border: `1px solid ${S.border}`,
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 14,
  color: S.textPrimary,
  fontFamily: S.font,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: S.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: 6,
  fontFamily: S.font,
}

// ─── Component ────────────────────────────────────────────────────────────────
export function EditDeliverableForm({ deliverable, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors]          = useState<FormErrors>({})
  const [focused, setFocused]        = useState<string | null>(null)
  const [values, setValues]          = useState<FormValues>({
    title:       deliverable.title,
    description: deliverable.description ?? '',
    url:         deliverable.url ?? '',
    due_date:    deliverable.due_date ?? '',
    type:        deliverable.type,
    status:      deliverable.status,
  })

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
        .from('project_deliverables')
        .update({
          title:       values.title.trim(),
          description: values.description.trim() || null,
          url:         values.url.trim() || null,
          due_date:    values.due_date.trim() || null,
          type:        values.type,
          status:      values.status,
        })
        .eq('id', deliverable.id)
        .select('*')
        .single()

      if (error || !data) {
        setErrors({ general: error?.message ?? 'No se pudo actualizar el entregable.' })
        return
      }

      onSuccess(data as Deliverable)
    })
  }

  function focusStyle(name: string): React.CSSProperties {
    return focused === name
      ? { borderColor: S.accent, boxShadow: `0 0 0 3px rgba(0,113,227,0.20)` }
      : {}
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* General error */}
      {errors.general && (
        <div
          style={{
            borderRadius: 8,
            background: 'rgba(255,69,58,0.10)',
            border: `1px solid rgba(255,69,58,0.25)`,
            padding: '10px 14px',
            fontSize: 13,
            color: S.accentRed,
            fontFamily: S.font,
          }}
        >
          {errors.general}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="ed-title" style={labelStyle}>
          Titulo <span style={{ color: S.accentRed }}>*</span>
        </label>
        <input
          id="ed-title"
          name="title"
          type="text"
          value={values.title}
          onChange={handleChange}
          onFocus={() => setFocused('title')}
          onBlur={() => setFocused(null)}
          disabled={isPending}
          placeholder="p. ej. Corte #3 — edicion preliminar"
          style={{
            ...inputStyle,
            ...focusStyle('title'),
            opacity: isPending ? 0.5 : 1,
          }}
        />
        {errors.title && (
          <p style={{ fontSize: 11, color: S.accentRed, marginTop: 4, fontFamily: S.font }}>
            {errors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="ed-description" style={labelStyle}>
          Descripcion
        </label>
        <textarea
          id="ed-description"
          name="description"
          rows={3}
          value={values.description}
          onChange={handleChange}
          onFocus={() => setFocused('description')}
          onBlur={() => setFocused(null)}
          disabled={isPending}
          placeholder="Notas opcionales..."
          style={{
            ...inputStyle,
            ...focusStyle('description'),
            resize: 'none',
            opacity: isPending ? 0.5 : 1,
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* URL */}
      <div>
        <label htmlFor="ed-url" style={labelStyle}>
          URL
        </label>
        <input
          id="ed-url"
          name="url"
          type="url"
          value={values.url}
          onChange={handleChange}
          onFocus={() => setFocused('url')}
          onBlur={() => setFocused(null)}
          disabled={isPending}
          placeholder="https://frame.io/..."
          style={{
            ...inputStyle,
            ...focusStyle('url'),
            fontFamily: "'SF Mono', ui-monospace, monospace",
            fontSize: 13,
            opacity: isPending ? 0.5 : 1,
          }}
        />
        {errors.url && (
          <p style={{ fontSize: 11, color: S.accentRed, marginTop: 4, fontFamily: S.font }}>
            {errors.url}
          </p>
        )}
      </div>

      {/* Due date */}
      <div>
        <label htmlFor="ed-due_date" style={labelStyle}>
          Fecha limite
        </label>
        <input
          id="ed-due_date"
          name="due_date"
          type="date"
          value={values.due_date}
          onChange={handleChange}
          onFocus={() => setFocused('due_date')}
          onBlur={() => setFocused(null)}
          disabled={isPending}
          style={{
            ...inputStyle,
            ...focusStyle('due_date'),
            opacity: isPending ? 0.5 : 1,
            colorScheme: 'dark',
          }}
        />
      </div>

      {/* Type + Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label htmlFor="ed-type" style={labelStyle}>
            Tipo
          </label>
          <select
            id="ed-type"
            name="type"
            value={values.type}
            onChange={handleChange}
            onFocus={() => setFocused('type')}
            onBlur={() => setFocused(null)}
            disabled={isPending}
            style={{
              ...inputStyle,
              ...focusStyle('type'),
              cursor: 'pointer',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ed-status" style={labelStyle}>
            Estado
          </label>
          <select
            id="ed-status"
            name="status"
            value={values.status}
            onChange={handleChange}
            onFocus={() => setFocused('status')}
            onBlur={() => setFocused(null)}
            disabled={isPending}
            style={{
              ...inputStyle,
              ...focusStyle('status'),
              cursor: 'pointer',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          style={{
            padding: '7px 14px',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 8,
            background: 'transparent',
            border: `1px solid ${S.border}`,
            color: S.textSecondary,
            cursor: 'pointer',
            fontFamily: S.font,
            transition: 'border-color 0.15s ease, color 0.15s ease',
            opacity: isPending ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.borderColor = 'rgba(255,255,255,0.20)'
            b.style.color = '#F5F5F7'
          }}
          onMouseLeave={(e) => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.borderColor = S.border
            b.style.color = S.textSecondary
          }}
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={isPending}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 16px',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 8,
            background: S.accent,
            border: 'none',
            color: '#FFFFFF',
            cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: S.font,
            transition: 'background 0.15s ease',
            opacity: isPending ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isPending) (e.currentTarget as HTMLButtonElement).style.background = '#0077ED'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = S.accent
          }}
        >
          {isPending && <Loader2 size={13} className="animate-spin" />}
          Guardar cambios
        </button>
      </div>
    </form>
  )
}
