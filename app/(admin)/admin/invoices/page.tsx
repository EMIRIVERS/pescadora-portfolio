import { createServiceClient } from '@/lib/supabase/server'
import InvoicesClient from './InvoicesClient'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

export default async function InvoicesPage() {
  const db = createServiceClient()

  const [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { data: invoicesRaw },
    { data: clients },
    { data: projects },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).from('invoices').select('*, clients(name), projects(title)').order('created_at', { ascending: false }),
    db.from('clients').select('id, name').order('name'),
    db.from('projects').select('id, title').order('title'),
  ])

  const invoices = (invoicesRaw ?? []) as Invoice[]

  // Stats
  const totalPending = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + Number(i.amount), 0)
  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + Number(i.amount), 0)
  const thisMonth = invoices
    .filter((i) => {
      const d = new Date(i.issue_date)
      const now = new Date()
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((s, i) => s + Number(i.amount), 0)

  function fmt(n: number, currency = 'MXN') {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  }

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: '#F5F5F7', letterSpacing: '-0.02em' }}>
          Facturas
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#86868B' }}>
          Gestión de facturación y pagos
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'Por cobrar', value: fmt(totalPending), color: '#FF9F0A' },
          { label: 'Cobrado', value: fmt(totalPaid), color: '#30D158' },
          { label: 'Este mes', value: fmt(thisMonth), color: '#0071E3' },
          { label: 'Total facturas', value: invoices.length.toString(), color: '#86868B' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: '1 1 140px',
              backgroundColor: '#1C1C1E',
              border: `1px solid rgba(255,255,255,0.06)`,
              borderTop: `2px solid ${s.color}`,
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#86868B', fontFamily: FONT }}>{s.label}</p>
            <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 600, color: '#F5F5F7', letterSpacing: '-0.02em', fontFamily: FONT }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Client table */}
      <InvoicesClient
        initialInvoices={invoices}
        clients={(clients ?? []) as { id: string; name: string }[]}
        projects={(projects ?? []) as { id: string; title: string }[]}
      />
    </div>
  )
}

export interface Invoice {
  id: string
  invoice_number: string
  amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string | null
  notes: string | null
  client_id: string | null
  project_id: string | null
  created_at: string
  clients: { name: string } | null
  projects: { title: string } | null
}
