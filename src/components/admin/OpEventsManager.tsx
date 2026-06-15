'use client'

/**
 * OpEventsManager — agenda operativa del calendario admin.
 * Crear/editar/eliminar eventos tipados (grabación, entrega, cobro, reunión)
 * ligados a proyecto + cliente, con el diseño Apple del panel.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, X, Check, Circle } from 'lucide-react'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  setCalendarEventStatus,
} from '@/lib/actions/calendar'
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  EVENT_TYPES,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarEventStatus,
} from '@/lib/calendar/types'

const FONT = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const BLUE = 'var(--dash-accent)'
const TYPES = EVENT_TYPES

const INPUT: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--dash-surface-3)',
  border: '1px solid var(--dash-border)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--dash-text-primary)',
  fontFamily: FONT,
  outline: 'none',
  boxSizing: 'border-box',
}
const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: 'var(--dash-text-secondary)',
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  marginBottom: 6,
  fontFamily: FONT,
}

interface Props {
  events: CalendarEvent[]
  clients: { id: string; name: string }[]
  projects: { id: string; title: string }[]
  invoices: { id: string; invoice_number: string }[]
}

interface FormState {
  id: string | null
  type: CalendarEventType
  title: string
  project_id: string
  client_id: string
  invoice_id: string
  event_date: string
  event_time: string
  notes: string
  status: CalendarEventStatus
}

function emptyForm(): FormState {
  return {
    id: null,
    type: 'grabacion',
    title: '',
    project_id: '',
    client_id: '',
    invoice_id: '',
    event_date: new Date().toISOString().slice(0, 10),
    event_time: '',
    notes: '',
    status: 'pendiente',
  }
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default function OpEventsManager({ events, clients, projects, invoices }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function openNew() {
    setForm(emptyForm())
    setError('')
    setOpen(true)
  }
  function openEdit(ev: CalendarEvent) {
    setForm({
      id: ev.id,
      type: ev.type,
      title: ev.title,
      project_id: ev.project_id ?? '',
      client_id: ev.client_id ?? '',
      invoice_id: ev.invoice_id ?? '',
      event_date: ev.event_date,
      event_time: ev.event_time ?? '',
      notes: ev.notes ?? '',
      status: ev.status,
    })
    setError('')
    setOpen(true)
  }

  function save() {
    setError('')
    if (!form.title.trim()) return setError('El título es obligatorio.')
    if (!form.event_date) return setError('La fecha es obligatoria.')

    const payload = {
      title: form.title.trim(),
      type: form.type,
      event_date: form.event_date,
      event_time: form.event_time || null,
      project_id: form.project_id || null,
      client_id: form.client_id || null,
      invoice_id: form.type === 'cobro' ? form.invoice_id || null : null,
      notes: form.notes,
      status: form.status,
    }
    startTransition(async () => {
      const result = form.id
        ? await updateCalendarEvent(form.id, payload)
        : await createCalendarEvent(payload)
      if (result.error) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  function toggleStatus(ev: CalendarEvent) {
    const next: CalendarEventStatus = ev.status === 'hecho' ? 'pendiente' : 'hecho'
    startTransition(async () => {
      await setCalendarEventStatus(ev.id, next)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete((c) => (c === id ? null : c)), 3000)
      return
    }
    setConfirmDelete(null)
    startTransition(async () => {
      await deleteCalendarEvent(id)
      router.refresh()
    })
  }

  const sorted = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date))

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '-0.01em', fontFamily: FONT }}>
            Agenda operativa
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>
            Grabaciones, entregas, cobros y reuniones
          </p>
        </div>
        <button type="button" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: BLUE, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer', fontFamily: FONT }}>
          <Plus size={14} strokeWidth={2} /> Nuevo evento
        </button>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
        {TYPES.map((t) => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>
            <span style={{ width: 9, height: 9, borderRadius: 9, background: EVENT_TYPE_COLORS[t] }} />
            {EVENT_TYPE_LABELS[t]}
          </span>
        ))}
      </div>

      {/* Lista */}
      {sorted.length === 0 ? (
        <div style={{ border: '1px solid var(--dash-border)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', fontSize: 13, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>
          Aún no hay eventos. Crea el primero para empezar a organizar el calendario.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((ev) => {
            const done = ev.status === 'hecho'
            return (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--dash-border)', background: 'var(--dash-surface-1)', opacity: done ? 0.6 : 1 }}>
                <button type="button" onClick={() => toggleStatus(ev)} disabled={isPending} title={done ? 'Marcar pendiente' : 'Marcar hecho'} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: done ? 'var(--dash-success)' : 'var(--dash-text-tertiary)', display: 'flex', padding: 0 }}>
                  {done ? <Check size={16} strokeWidth={2.5} /> : <Circle size={16} strokeWidth={1.5} />}
                </button>
                <span style={{ width: 10, height: 10, borderRadius: 10, background: EVENT_TYPE_COLORS[ev.type], flexShrink: 0 }} />
                <div style={{ width: 92, flexShrink: 0, fontFamily: FONT }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dash-text-primary)' }}>{fmtDate(ev.event_date)}</span>
                  {ev.event_time && <span style={{ display: 'block', fontSize: 11, color: 'var(--dash-text-tertiary)' }}>{ev.event_time.slice(0, 5)}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0, fontFamily: FONT }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--dash-text-primary)', textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {EVENT_TYPE_LABELS[ev.type]} · {ev.title}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--dash-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[ev.projects?.title, ev.clients?.name].filter(Boolean).join(' · ') || 'Sin proyecto'}
                  </p>
                </div>
                <button type="button" onClick={() => openEdit(ev)} title="Editar" style={{ border: 'none', background: 'transparent', color: 'var(--dash-text-tertiary)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                  <Pencil size={13} strokeWidth={1.5} />
                </button>
                <button type="button" onClick={() => handleDelete(ev.id)} disabled={isPending} title={confirmDelete === ev.id ? 'Confirmar' : 'Eliminar'} style={{ border: confirmDelete === ev.id ? '1px solid rgba(255,69,58,0.4)' : 'none', background: confirmDelete === ev.id ? 'rgba(255,69,58,0.12)' : 'transparent', color: confirmDelete === ev.id ? 'var(--dash-danger)' : 'var(--dash-text-tertiary)', cursor: 'pointer', padding: confirmDelete === ev.id ? '3px 8px' : 4, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: FONT }}>
                  <Trash2 size={13} strokeWidth={1.5} />
                  {confirmDelete === ev.id && <span>Confirmar</span>}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {open && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div style={{ backgroundColor: 'var(--dash-surface-2)', border: '1px solid var(--dash-border-strong)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 32px 80px rgba(0,0,0,0.6)', marginTop: 24, fontFamily: FONT }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--dash-text-primary)' }}>{form.id ? 'Editar evento' : 'Nuevo evento'}</span>
              <button type="button" onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', color: 'var(--dash-text-tertiary)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Tipo */}
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}>Tipo</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => set('type', t)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 8, fontSize: 12, fontFamily: FONT, cursor: 'pointer', border: `1px solid ${form.type === t ? EVENT_TYPE_COLORS[t] : 'var(--dash-border)'}`, background: form.type === t ? `${EVENT_TYPE_COLORS[t]}22` : 'var(--dash-surface-3)', color: form.type === t ? EVENT_TYPE_COLORS[t] : 'var(--dash-text-secondary)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 8, background: EVENT_TYPE_COLORS[t] }} />
                    {EVENT_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LABEL}>Título *</label>
                <input value={form.title} onChange={(e) => set('title', e.target.value)} style={INPUT} placeholder="Rodaje día 1 — Marca X" autoFocus />
              </div>
              <div>
                <label style={LABEL}>Fecha *</label>
                <input type="date" value={form.event_date} onChange={(e) => set('event_date', e.target.value)} style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Hora</label>
                <input type="time" value={form.event_time} onChange={(e) => set('event_time', e.target.value)} style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Proyecto</label>
                <select value={form.project_id} onChange={(e) => set('project_id', e.target.value)} style={{ ...INPUT, appearance: 'none' }}>
                  <option value="">Sin proyecto</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL}>Cliente</label>
                <select value={form.client_id} onChange={(e) => set('client_id', e.target.value)} style={{ ...INPUT, appearance: 'none' }}>
                  <option value="">Auto (del proyecto)</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {form.type === 'cobro' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LABEL}>Factura ligada</label>
                  <select value={form.invoice_id} onChange={(e) => set('invoice_id', e.target.value)} style={{ ...INPUT, appearance: 'none' }}>
                    <option value="">Sin factura</option>
                    {invoices.map((i) => <option key={i.id} value={i.id}>{i.invoice_number}</option>)}
                  </select>
                </div>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LABEL}>Notas</label>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} style={{ ...INPUT, resize: 'vertical' }} placeholder="Detalles, locación, responsables..." />
              </div>
            </div>

            {error && <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--dash-danger)' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setOpen(false)} style={{ padding: '11px 20px', borderRadius: 8, border: '1px solid var(--dash-border-strong)', background: 'transparent', color: 'var(--dash-text-primary)', fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={save} disabled={isPending} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: BLUE, color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.5 : 1 }}>
                {isPending ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Crear evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
