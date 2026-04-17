import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

interface PortalInvoice {
  id: string
  invoice_number: string
  amount: number
  currency: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  notes: string | null
  client_id: string | null
  project_id: string | null
  projects: { title: string } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

type VisibleStatus = 'sent' | 'paid' | 'overdue'

const STATUS_LABEL: Record<VisibleStatus, string> = {
  sent: 'Pendiente de pago',
  paid: 'Pagada',
  overdue: 'Vencida',
}

const STATUS_STYLE: Record<VisibleStatus, { background: string; color: string; border: string }> = {
  sent: {
    background: '#FFF7E6',
    color: '#92400E',
    border: '1px solid #FDE68A',
  },
  paid: {
    background: '#ECFDF5',
    color: '#065F46',
    border: '1px solid #A7F3D0',
  },
  overdue: {
    background: '#FEF2F2',
    color: '#991B1B',
    border: '1px solid #FECACA',
  },
}

function isVisibleStatus(status: InvoiceStatus): status is VisibleStatus {
  return status === 'sent' || status === 'paid' || status === 'overdue'
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PortalInvoicesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Resolve client record for this user
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('profile_id', user.id)
    .single()

  if (!client) {
    return (
      <main style={{ fontFamily: FONT, minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem' }}>
          <Link
            href="/portal"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: '#6B7280',
              textDecoration: 'none',
              marginBottom: '2rem',
            }}
          >
            <span>&larr;</span>
            <span>Inicio</span>
          </Link>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: '#111827',
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Mis facturas
          </h1>
          <div
            style={{
              marginTop: '2.5rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 16,
              padding: '3rem 2rem',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 15, color: '#6B7280', margin: 0 }}>
              Sin facturas asignadas.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Fetch invoices for this client — invoices table is not in the generated types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invoiceRows } = await (supabase as any)
    .from('invoices')
    .select('id, invoice_number, amount, currency, status, issue_date, due_date, notes, client_id, project_id, projects:projects(title)')
    .eq('client_id', client.id)
    .neq('status', 'draft')
    .order('issue_date', { ascending: false })

  const invoices: PortalInvoice[] = ((invoiceRows ?? []) as unknown as PortalInvoice[]).filter(
    (inv) => isVisibleStatus(inv.status)
  )

  return (
    <main style={{ fontFamily: FONT, minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem' }}>
        {/* Back link */}
        <Link
          href="/portal"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: '#6B7280',
            textDecoration: 'none',
            marginBottom: '2rem',
          }}
        >
          <span>&larr;</span>
          <span>Inicio</span>
        </Link>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: '#111827',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Mis facturas
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            {invoices.length === 0
              ? 'No hay facturas disponibles por ahora.'
              : `${invoices.length} factura${invoices.length !== 1 ? 's' : ''} encontrada${invoices.length !== 1 ? 's' : ''}.`}
          </p>
        </div>

        {/* Empty state */}
        {invoices.length === 0 && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 16,
              padding: '3rem 2rem',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 12px 0' }}>
              Sin facturas asignadas.
            </p>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
              Las facturas apareceran aqui cuando sean emitidas.
            </p>
          </div>
        )}

        {/* Invoice cards */}
        {invoices.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {invoices.map((invoice) => {
              const visibleStatus = invoice.status as VisibleStatus
              const statusStyle = STATUS_STYLE[visibleStatus]
              const projectTitle =
                invoice.projects
                  ? (Array.isArray(invoice.projects)
                      ? (invoice.projects[0] as { title: string } | undefined)?.title
                      : invoice.projects.title)
                  : null

              return (
                <div
                  key={invoice.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: 14,
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {/* Top row: invoice number + status badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#111827',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {invoice.invoice_number}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        padding: '3px 10px',
                        borderRadius: 6,
                        ...statusStyle,
                      }}
                    >
                      {STATUS_LABEL[visibleStatus]}
                    </span>
                  </div>

                  {/* Project */}
                  {projectTitle && (
                    <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
                      Proyecto:{' '}
                      <span style={{ color: '#374151', fontWeight: 500 }}>{projectTitle}</span>
                    </p>
                  )}

                  {/* Amount + due date */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                      borderTop: '1px solid #F3F4F6',
                      paddingTop: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: '#111827',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {formatCurrency(Number(invoice.amount), invoice.currency)}
                    </span>
                    {invoice.due_date && (
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                        Vence:{' '}
                        <span
                          style={{
                            color: visibleStatus === 'overdue' ? '#DC2626' : '#6B7280',
                            fontWeight: visibleStatus === 'overdue' ? 600 : 400,
                          }}
                        >
                          {formatDate(invoice.due_date)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
