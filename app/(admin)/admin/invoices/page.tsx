import { createServiceClient } from '@/lib/supabase/server'
import InvoicesClient from './InvoicesClient'

const FONT = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

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

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // An invoice is "effectively overdue" when: DB status is 'overdue', OR status is 'sent' with a past due_date
  function isEffectivelyOverdue(inv: Invoice): boolean {
    if (inv.status === 'overdue') return true
    if (inv.status === 'sent' && inv.due_date) {
      return new Date(inv.due_date + 'T00:00:00') < today
    }
    return false
  }

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

  const overdueInvoices = invoices.filter(isEffectivelyOverdue)
  const totalOverdue = overdueInvoices.reduce((s, i) => s + Number(i.amount), 0)

  function fmt(n: number, currency = 'MXN') {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  }

  const stats: { label: string; value: string; sub?: string; color: string }[] = [
    { label: 'Por cobrar', value: fmt(totalPending), color: 'var(--dash-warning)' },
    { label: 'Cobrado', value: fmt(totalPaid), color: 'var(--dash-success)' },
    { label: 'Este mes', value: fmt(thisMonth), color: 'var(--dash-accent)' },
    {
      label: 'Vencidas',
      value: fmt(totalOverdue),
      sub: `${overdueInvoices.length} factura${overdueInvoices.length !== 1 ? 's' : ''}`,
      color: 'var(--dash-danger)',
    },
    { label: 'Total facturas', value: invoices.length.toString(), color: 'var(--dash-text-secondary)' },
  ]

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '-0.02em' }}>
          Facturas
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--dash-text-secondary)' }}>
          Gestión de facturación y pagos
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              flex: '1 1 140px',
              backgroundColor: 'var(--dash-surface-2)',
              border: `1px solid var(--dash-border)`,
              borderTop: `2px solid ${s.color}`,
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--dash-text-secondary)', fontFamily: FONT }}>{s.label}</p>
            <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 600, color: s.label === 'Vencidas' ? s.color : 'var(--dash-text-primary)', letterSpacing: '-0.02em', fontFamily: FONT }}>{s.value}</p>
            {s.sub && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: s.color, fontFamily: FONT }}>{s.sub}</p>
            )}
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
  title: string | null
  amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string | null
  notes: string | null
  client_id: string | null
  project_id: string | null
  client_type: 'DIRECTO' | 'EMPRESA' | null
  items: import('@/lib/billing/catalog').QuoteLine[] | null
  tax: import('@/lib/billing/tax').TaxBreakdown | null
  fiscal_data: import('@/lib/billing/catalog').FiscalData | null
  created_at: string
  clients: { name: string } | null
  projects: { title: string } | null
}
