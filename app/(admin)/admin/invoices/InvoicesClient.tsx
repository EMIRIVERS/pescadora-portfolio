'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Printer, Trash2, X, Check, AlertCircle, Info } from 'lucide-react'
import { createInvoice, updateInvoiceStatus, deleteInvoice } from '@/lib/actions/invoices'
import type { Invoice } from './page'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  draft:     { color: 'var(--dash-text-secondary)', bg: 'rgba(134,134,139,0.12)', label: 'Borrador' },
  sent:      { color: '#0071E3', bg: 'rgba(0,113,227,0.12)',   label: 'Enviada' },
  paid:      { color: 'var(--dash-success)', bg: 'rgba(48,209,88,0.12)',   label: 'Pagada' },
  overdue:   { color: 'var(--dash-danger)', bg: 'rgba(255,69,58,0.12)',   label: 'Vencida' },
  cancelled: { color: 'var(--dash-text-tertiary)', bg: 'rgba(72,72,74,0.12)',    label: 'Cancelada' },
}

function fmt(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function fmtDueDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtIssueDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Returns true when due_date is in the past and invoice is not paid/cancelled/draft */
function isOverdue(inv: Invoice): boolean {
  if (!inv.due_date) return false
  if (inv.status === 'paid' || inv.status === 'cancelled') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(inv.due_date + 'T00:00:00') < today
}

/** Returns true when due_date is within the next 7 days and not already overdue */
function isDueSoon(inv: Invoice): boolean {
  if (!inv.due_date) return false
  if (inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'overdue') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(inv.due_date + 'T00:00:00')
  const sevenDays = new Date(today)
  sevenDays.setDate(sevenDays.getDate() + 7)
  return due >= today && due <= sevenDays
}

function dueDateColor(inv: Invoice): string {
  if (isOverdue(inv)) return 'var(--dash-danger)'
  if (isDueSoon(inv)) return 'var(--dash-warning)'
  return 'var(--dash-text-secondary)'
}

interface Props {
  initialInvoices: Invoice[]
  clients: { id: string; name: string }[]
  projects: { id: string; title: string }[]
}

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

function NotesCell({ notes }: { notes: string }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Ver notas"
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--dash-warning)',
          cursor: 'pointer',
          padding: 2,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Info size={13} strokeWidth={1.8} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 100,
            right: 0,
            top: 24,
            minWidth: 220,
            maxWidth: 320,
            backgroundColor: 'var(--dash-surface-2)',
            border: '1px solid var(--dash-border-strong)',
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <p
            style={{
              margin: '0 0 4px',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--dash-text-tertiary)',
              fontFamily: FONT,
            }}
          >
            Notas
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--dash-text-secondary)', lineHeight: 1.55, fontFamily: FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {notes}
          </p>
        </div>
      )}
    </div>
  )
}

export default function InvoicesClient({ initialInvoices, clients, projects }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createInvoice(fd)
      if (result.error) { setError(result.error); return }
      setShowForm(false)
      router.refresh()
    })
  }

  function handleStatusChange(id: string, status: Invoice['status']) {
    startTransition(async () => {
      await updateInvoiceStatus(id, status)
      setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status } : i))
    })
  }

  function handleMarkPaid(id: string) {
    // Optimistic update
    setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: 'paid' } : i))
    startTransition(async () => {
      const result = await updateInvoiceStatus(id, 'paid')
      if (result.error) {
        // Revert on error
        setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: initialInvoices.find((x) => x.id === id)?.status ?? i.status } : i))
      }
    })
  }

  function handleMarkOverdue(id: string) {
    setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: 'overdue' } : i))
    startTransition(async () => {
      const result = await updateInvoiceStatus(id, 'overdue')
      if (result.error) {
        setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: initialInvoices.find((x) => x.id === id)?.status ?? i.status } : i))
      }
    })
  }

  function handleDelete(id: string, num: string) {
    if (!window.confirm(`Eliminar factura ${num}? Esta accion no se puede deshacer.`)) return
    startTransition(async () => {
      await deleteInvoice(id)
      setInvoices((prev) => prev.filter((i) => i.id !== id))
    })
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>{invoices.length} factura{invoices.length !== 1 ? 's' : ''}</span>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', backgroundColor: '#0071E3', border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff',
            cursor: 'pointer', fontFamily: FONT,
          }}
        >
          <Plus size={14} strokeWidth={2} /> Nueva factura
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ backgroundColor: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dash-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FONT }}>Nueva factura</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ border: 'none', background: 'transparent', color: 'var(--dash-text-tertiary)', cursor: 'pointer' }}>
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--dash-text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>N Factura *</label>
                <input name="invoice_number" required style={INPUT} placeholder="FAC-001" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--dash-text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Monto *</label>
                <input name="amount" type="number" min="0" step="0.01" required style={INPUT} placeholder="0.00" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--dash-text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Moneda</label>
                <select name="currency" style={{ ...INPUT, appearance: 'none' }}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--dash-text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Cliente</label>
                <select name="client_id" style={{ ...INPUT, appearance: 'none' }}>
                  <option value="">Sin cliente</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--dash-text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Proyecto</label>
                <select name="project_id" style={{ ...INPUT, appearance: 'none' }}>
                  <option value="">Sin proyecto</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--dash-text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Fecha emision</label>
                <input name="issue_date" type="date" style={INPUT} defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--dash-text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Fecha vencimiento</label>
                <input name="due_date" type="date" style={INPUT} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--dash-text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Estado</label>
                <select name="status" style={{ ...INPUT, appearance: 'none' }}>
                  {Object.entries(STATUS_STYLES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--dash-text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Notas</label>
              <textarea name="notes" rows={2} style={{ ...INPUT, resize: 'vertical' }} placeholder="Notas internas..." />
            </div>
            {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--dash-danger)', fontFamily: FONT }}>{error}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" disabled={isPending} style={{ padding: '9px 20px', backgroundColor: '#0071E3', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.5 : 1, fontFamily: FONT }}>
                {isPending ? 'Guardando...' : 'Crear factura'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 16px', border: 'none', background: 'transparent', color: 'var(--dash-text-tertiary)', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {invoices.length === 0 ? (
        <div style={{ border: '1px solid var(--dash-border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>Sin facturas todavia.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--dash-surface-1)', border: '1px solid var(--dash-border)', borderRadius: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--dash-border)' }}>
                {['Factura', 'Cliente', 'Proyecto', 'Monto', 'Estado', 'Emision', 'Vence', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--dash-text-tertiary)', fontFamily: FONT, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => {
                const overdueVisual = isOverdue(inv)
                const effectiveStatus = overdueVisual && inv.status === 'sent' ? 'overdue' : inv.status
                const s = STATUS_STYLES[effectiveStatus] ?? STATUS_STYLES.draft
                const canMarkPaid = inv.status === 'sent' || inv.status === 'overdue' || overdueVisual
                return (
                  <tr key={inv.id} style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--dash-border)', backgroundColor: overdueVisual && inv.status === 'sent' ? 'rgba(255,69,58,0.04)' : undefined }}>
                    {/* Factura number */}
                    <td style={{ padding: '12px 16px', fontFamily: FONT }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dash-text-primary)' }}>{inv.invoice_number}</span>
                        {/* Visual overdue badge for invoices that are 'sent' but past due date — not yet confirmed in DB */}
                        {overdueVisual && inv.status === 'sent' && (
                          <span
                            style={{
                              padding: '1px 7px',
                              borderRadius: 20,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: '0.07em',
                              textTransform: 'uppercase',
                              backgroundColor: 'rgba(255,69,58,0.15)',
                              color: 'var(--dash-danger)',
                              border: '1px solid rgba(255,69,58,0.3)',
                              fontFamily: FONT,
                            }}
                          >
                            VENCIDA
                          </span>
                        )}
                        {inv.notes && <NotesCell notes={inv.notes} />}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--dash-text-secondary)', fontFamily: FONT }}>{inv.clients?.name ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--dash-text-secondary)', fontFamily: FONT }}>{inv.projects?.title ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'var(--dash-text-primary)', fontFamily: FONT, whiteSpace: 'nowrap' }}>
                      {fmt(Number(inv.amount), inv.currency)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv.id, e.target.value as Invoice['status'])}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 20,
                          border: `1px solid ${s.color}44`,
                          backgroundColor: s.bg,
                          color: s.color,
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: FONT,
                          outline: 'none',
                          appearance: 'none',
                        }}
                      >
                        {Object.entries(STATUS_STYLES).map(([v, st]) => (
                          <option key={v} value={v} style={{ backgroundColor: 'var(--dash-surface-2)', color: 'var(--dash-text-primary)' }}>{st.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--dash-text-secondary)', fontFamily: FONT, whiteSpace: 'nowrap' }}>{fmtIssueDate(inv.issue_date)}</td>
                    {/* Due date with color coding */}
                    <td style={{ padding: '12px 16px', fontSize: 13, color: dueDateColor(inv), fontFamily: FONT, whiteSpace: 'nowrap', fontWeight: isOverdue(inv) ? 600 : 400 }}>
                      {fmtDueDate(inv.due_date)}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        {/* "Actualizar a vencida" — only for sent invoices that are past due in the UI */}
                        {overdueVisual && inv.status === 'sent' && (
                          <button
                            type="button"
                            onClick={() => handleMarkOverdue(inv.id)}
                            disabled={isPending}
                            title="Actualizar a vencida en la base de datos"
                            style={{
                              border: '1px solid rgba(255,69,58,0.35)',
                              background: 'rgba(255,69,58,0.1)',
                              color: 'var(--dash-danger)',
                              cursor: isPending ? 'not-allowed' : 'pointer',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              fontFamily: FONT,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <AlertCircle size={11} strokeWidth={2} />
                            Actualizar a vencida
                          </button>
                        )}
                        {/* Quick "Marcar pagada" — green check for sent/overdue */}
                        {canMarkPaid && inv.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(inv.id)}
                            disabled={isPending}
                            title="Marcar como pagada"
                            style={{
                              border: '1px solid rgba(48,209,88,0.3)',
                              background: 'rgba(48,209,88,0.1)',
                              color: 'var(--dash-success)',
                              cursor: isPending ? 'not-allowed' : 'pointer',
                              padding: 5,
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Check size={13} strokeWidth={2.5} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/invoices/${inv.id}`)}
                          style={{ border: 'none', background: 'transparent', color: 'var(--dash-text-secondary)', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                          title="Ver / Imprimir factura"
                        >
                          <Printer size={14} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(inv.id, inv.invoice_number)}
                          style={{ border: 'none', background: 'transparent', color: 'var(--dash-text-tertiary)', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                          title="Eliminar factura"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
