'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'
import { createInvoice, updateInvoiceStatus, deleteInvoice } from '../../../actions/invoices'
import type { Invoice } from './page'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  draft:     { color: '#86868B', bg: 'rgba(134,134,139,0.12)', label: 'Borrador' },
  sent:      { color: '#0071E3', bg: 'rgba(0,113,227,0.12)',   label: 'Enviada' },
  paid:      { color: '#30D158', bg: 'rgba(48,209,88,0.12)',   label: 'Pagada' },
  overdue:   { color: '#FF453A', bg: 'rgba(255,69,58,0.12)',   label: 'Vencida' },
  cancelled: { color: '#48484A', bg: 'rgba(72,72,74,0.12)',    label: 'Cancelada' },
}

function fmt(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  initialInvoices: Invoice[]
  clients: { id: string; name: string }[]
  projects: { id: string; title: string }[]
}

const INPUT: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#2C2C2E',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  color: '#F5F5F7',
  fontFamily: FONT,
  outline: 'none',
  boxSizing: 'border-box',
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
        <span style={{ fontSize: 13, color: '#48484A', fontFamily: FONT }}>{invoices.length} factura{invoices.length !== 1 ? 's' : ''}</span>
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
        <div style={{ backgroundColor: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#86868B', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FONT }}>Nueva factura</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ border: 'none', background: 'transparent', color: '#48484A', cursor: 'pointer' }}>
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#86868B', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>N° Factura *</label>
                <input name="invoice_number" required style={INPUT} placeholder="FAC-001" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#86868B', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Monto *</label>
                <input name="amount" type="number" min="0" step="0.01" required style={INPUT} placeholder="0.00" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#86868B', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Moneda</label>
                <select name="currency" style={{ ...INPUT, appearance: 'none' }}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#86868B', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Cliente</label>
                <select name="client_id" style={{ ...INPUT, appearance: 'none' }}>
                  <option value="">Sin cliente</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#86868B', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Proyecto</label>
                <select name="project_id" style={{ ...INPUT, appearance: 'none' }}>
                  <option value="">Sin proyecto</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#86868B', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Fecha emisión</label>
                <input name="issue_date" type="date" style={INPUT} defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#86868B', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Fecha vencimiento</label>
                <input name="due_date" type="date" style={INPUT} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#86868B', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Estado</label>
                <select name="status" style={{ ...INPUT, appearance: 'none' }}>
                  {Object.entries(STATUS_STYLES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#86868B', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT }}>Notas</label>
              <textarea name="notes" rows={2} style={{ ...INPUT, resize: 'vertical' }} placeholder="Notas internas..." />
            </div>
            {error && <p style={{ margin: 0, fontSize: 13, color: '#FF453A', fontFamily: FONT }}>{error}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" disabled={isPending} style={{ padding: '9px 20px', backgroundColor: '#0071E3', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.5 : 1, fontFamily: FONT }}>
                {isPending ? 'Guardando...' : 'Crear factura'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 16px', border: 'none', background: 'transparent', color: '#48484A', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {invoices.length === 0 ? (
        <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#48484A', fontFamily: FONT }}>Sin facturas todavía.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Factura', 'Cliente', 'Proyecto', 'Monto', 'Estado', 'Emisión', 'Vencimiento', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#48484A', fontFamily: FONT, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => {
                const s = STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft
                return (
                  <tr key={inv.id} style={{ borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: FONT }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F7' }}>{inv.invoice_number}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#86868B', fontFamily: FONT }}>{inv.clients?.name ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#86868B', fontFamily: FONT }}>{inv.projects?.title ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#F5F5F7', fontFamily: FONT, whiteSpace: 'nowrap' }}>
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
                          <option key={v} value={v} style={{ backgroundColor: '#1C1C1E', color: '#F5F5F7' }}>{st.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#86868B', fontFamily: FONT, whiteSpace: 'nowrap' }}>{fmtDate(inv.issue_date)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid' ? '#FF453A' : '#86868B', fontFamily: FONT, whiteSpace: 'nowrap' }}>
                      {fmtDate(inv.due_date)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        style={{ border: 'none', background: 'transparent', color: '#3A3A3C', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                        title="Eliminar factura"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
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
