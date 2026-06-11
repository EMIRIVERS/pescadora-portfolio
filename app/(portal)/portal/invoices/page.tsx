import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'

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
    background: 'var(--portal-badge-sent-bg)',
    color: 'var(--portal-badge-sent-color)',
    border: '1px solid var(--portal-badge-sent-border)',
  },
  paid: {
    background: 'var(--portal-badge-paid-bg)',
    color: 'var(--portal-badge-paid-color)',
    border: '1px solid var(--portal-badge-paid-border)',
  },
  overdue: {
    background: 'var(--portal-badge-overdue-bg)',
    color: 'var(--portal-badge-overdue-color)',
    border: '1px solid var(--portal-badge-overdue-border)',
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

interface PortalInvoicesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PortalInvoicesPage({ searchParams }: PortalInvoicesPageProps) {
  const sp = await searchParams
  const ctx = await resolvePortalClient(sp)
  if (!ctx) redirect('/login')
  const { supabase, clientId, clientName } = ctx
  const client = { id: clientId, name: clientName }

  if (!client) {
    return (
      <main style={{ fontFamily: FONT, minHeight: '100vh', backgroundColor: 'var(--portal-bg)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 1.5rem)' }}>
          <Link
            href={portalLink('/portal', ctx)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'var(--portal-text-muted)',
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
              color: 'var(--portal-text)',
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Mis facturas
          </h1>
          <div
            style={{
              marginTop: '2.5rem',
              backgroundColor: 'var(--portal-surface)',
              border: '1px solid var(--portal-border)',
              borderRadius: 16,
              padding: '3rem 2rem',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 15, color: 'var(--portal-text-muted)', margin: 0 }}>
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
    <main style={{ fontFamily: FONT, minHeight: '100vh', backgroundColor: 'var(--portal-bg)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 1.5rem)' }}>
        {/* Back link */}
        <Link
          href="/portal"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--portal-text-muted)',
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
              color: 'var(--portal-text)',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Mis facturas
          </h1>
          <p style={{ fontSize: 13, color: 'var(--portal-text-muted)', margin: 0 }}>
            {invoices.length === 0
              ? 'No hay facturas disponibles por ahora.'
              : `${invoices.length} factura${invoices.length !== 1 ? 's' : ''} encontrada${invoices.length !== 1 ? 's' : ''}.`}
          </p>
        </div>

        {/* Empty state */}
        {invoices.length === 0 && (
          <div
            style={{
              backgroundColor: 'var(--portal-surface)',
              border: '1px solid var(--portal-border)',
              borderRadius: 16,
              padding: '3rem 2rem',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 15, color: 'var(--portal-text-muted)', margin: '0 0 12px 0' }}>
              Sin facturas asignadas.
            </p>
            <p style={{ fontSize: 13, color: 'var(--portal-text-dim)', margin: 0 }}>
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
                    backgroundColor: 'var(--portal-surface)',
                    border: '1px solid var(--portal-border)',
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
                        color: 'var(--portal-text)',
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
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--portal-text-muted)' }}>
                      Proyecto:{' '}
                      <span style={{ color: 'var(--portal-text-strong)', fontWeight: 500 }}>{projectTitle}</span>
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
                      borderTop: '1px solid var(--portal-divider)',
                      paddingTop: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: 'var(--portal-text)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {formatCurrency(Number(invoice.amount), invoice.currency)}
                    </span>
                    {invoice.due_date && (
                      <span style={{ fontSize: 12, color: 'var(--portal-text-dim)' }}>
                        Vence:{' '}
                        <span
                          style={{
                            color: visibleStatus === 'overdue' ? 'var(--portal-danger)' : 'var(--portal-text-muted)',
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
