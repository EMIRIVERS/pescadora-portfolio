'use client'

import { useEffect, useRef, useState } from 'react'
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

const inputClass =
  'w-full bg-[#111] border border-[#222] rounded-sm px-3 py-2 text-sm text-[#e8e8e8] font-mono placeholder-[#333] focus:outline-none focus:border-[#333] transition-colors'

const labelClass =
  'block text-[10px] font-mono tracking-[0.2em] uppercase text-[#555] mb-1'

export default function AddLeadModal({ onClose, onCreated, defaultStatus = 'new' }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Close on Escape key
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
    } catch (err) {
      setError('Ocurrió un error inesperado.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full mx-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#555]">
            Nuevo lead
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[#333] hover:text-[#666] transition-colors font-mono text-sm"
          >
            esc
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nombre */}
          <div>
            <label htmlFor="add-name" className={labelClass}>
              Nombre <span className="text-[#e8341a]">*</span>
            </label>
            <input
              id="add-name"
              name="name"
              type="text"
              required
              placeholder="Juan García"
              className={inputClass}
            />
          </div>

          {/* Email + Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-email" className={labelClass}>
                Email
              </label>
              <input
                id="add-email"
                name="email"
                type="email"
                placeholder="juan@ejemplo.com"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="add-phone" className={labelClass}>
                Teléfono
              </label>
              <input
                id="add-phone"
                name="phone"
                type="tel"
                placeholder="+54 9 11 0000-0000"
                className={inputClass}
              />
            </div>
          </div>

          {/* Empresa */}
          <div>
            <label htmlFor="add-company" className={labelClass}>
              Empresa
            </label>
            <input
              id="add-company"
              name="company"
              type="text"
              placeholder="Nombre de la empresa"
              className={inputClass}
            />
          </div>

          {/* Tipo de proyecto + Rango de presupuesto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-project-type" className={labelClass}>
                Tipo de proyecto
              </label>
              <select
                id="add-project-type"
                name="project_type"
                className={inputClass}
                defaultValue=""
              >
                <option value="" disabled>
                  Seleccionar...
                </option>
                <option value="Videoclip">Videoclip</option>
                <option value="Corporativo">Corporativo</option>
                <option value="Restaurante">Restaurante</option>
                <option value="Comercial">Comercial</option>
                <option value="Fotografía">Fotografía</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label htmlFor="add-budget" className={labelClass}>
                Rango de presupuesto
              </label>
              <select
                id="add-budget"
                name="budget_range"
                className={inputClass}
                defaultValue=""
              >
                <option value="" disabled>
                  Seleccionar...
                </option>
                <option value="< $5k">&lt; $5k</option>
                <option value="$5k-$15k">$5k – $15k</option>
                <option value="$15k-$30k">$15k – $30k</option>
                <option value="$30k-$50k">$30k – $50k</option>
                <option value="$50k+">$50k+</option>
              </select>
            </div>
          </div>

          {/* Fuente + Estado inicial */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-source" className={labelClass}>
                Fuente
              </label>
              <select
                id="add-source"
                name="source"
                className={inputClass}
                defaultValue="manual"
              >
                <option value="manual">Manual</option>
                <option value="referral">Referido</option>
                <option value="instagram">Instagram</option>
                <option value="web">Web</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label htmlFor="add-status" className={labelClass}>
                Estado inicial
              </label>
              <select
                id="add-status"
                name="status"
                className={inputClass}
                defaultValue={defaultStatus}
              >
                {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label htmlFor="add-notes" className={labelClass}>
              Notas
            </label>
            <textarea
              id="add-notes"
              name="notes"
              rows={3}
              placeholder="Detalles del proyecto, contexto..."
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-[#e8341a] text-xs font-mono">{error}</p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#e8341a] hover:bg-[#cc2d15] text-white text-xs font-mono tracking-[0.2em] uppercase rounded-sm transition-colors disabled:opacity-40"
            >
              {submitting ? 'Creando...' : 'Crear lead'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 border border-[#1a1a1a] text-[#555] text-xs font-mono tracking-[0.2em] uppercase rounded-sm hover:border-[#2a2a2a] hover:text-[#888] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
