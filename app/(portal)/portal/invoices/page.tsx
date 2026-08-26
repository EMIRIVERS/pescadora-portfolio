import { redirect } from 'next/navigation'
import { Download } from 'lucide-react'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import {
  PortalShell,
  BackLink,
  Masthead,
  SectionLabel,
  StatusTag,
  EmptyState,
  PORTAL,
} from '@/components/portal/ui'

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

type VisibleStatus = 'sent' | 'paid' | 'overdue'

const STATUS_LABEL: Record<VisibleStatus, string> = {
  sent: 'Pendiente de pago',
  paid: 'Pagada',
  overdue: 'Vencida',
}

const STATUS_COLOR: Record<VisibleStatus, string> = {
  sent: 'var(--portal-badge-sent-color)',
  paid: 'var(--portal-badge-paid-color)',
  overdue: 'var(--portal-badge-overdue-color)',
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
    <PortalShell maxWidth={760}>
      <BackLink href={portalLink('/portal', ctx)} />

      <Masthead
        title="Facturas"
        lead={
          invoices.length === 0
            ? 'No hay facturas disponibles por ahora. Aquí encontrarás el importe y vencimiento de cada emisión.'
            : `Tienes ${invoices.length} factura${invoices.length !== 1 ? 's' : ''} a tu nombre. Revisa importe, estado y fechas de vencimiento.`
        }
      />

      {/* Empty state */}
      {invoices.length === 0 && (
        <EmptyState
          title="Sin facturas asignadas."
          body="Las facturas aparecerán aquí en cuanto sean emitidas para tus producciones."
        />
      )}

      {/* Invoice cards */}
      {invoices.length > 0 && (
        <section>
          <div style={{ marginBottom: '1.6rem' }}>
            <SectionLabel index="01">Tus facturas</SectionLabel>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {invoices.map((invoice) => {
              const visibleStatus = invoice.status as VisibleStatus
              const projectTitle =
                invoice.projects
                  ? (Array.isArray(invoice.projects)
                      ? (invoice.projects[0] as { title: string } | undefined)?.title
                      : invoice.projects.title)
                  : null

              return (
                <article
                  key={invoice.id}
                  className="portal-card"
                  style={{ borderRadius: '6px', padding: 'clamp(1.5rem, 3vw, 2rem)' }}
                >
                  {/* Top row: invoice number + status tag */}
                  <div
                    className="flex items-start justify-between gap-4"
                    style={{ marginBottom: '1.4rem', flexWrap: 'wrap' }}
                  >
                    <div>
                      <p
                        style={{
                          fontFamily: PORTAL.mono,
                          fontSize: '0.6rem',
                          letterSpacing: '0.2em',
                          textTransform: 'uppercase',
                          color: PORTAL.dim,
                          margin: '0 0 0.55rem',
                        }}
                      >
                        Factura
                      </p>
                      <h2
                        style={{
                          fontFamily: PORTAL.serif,
                          fontWeight: 500,
                          fontSize: 'clamp(1.35rem, 2.6vw, 1.75rem)',
                          lineHeight: 1.1,
                          letterSpacing: '-0.01em',
                          color: PORTAL.cream,
                          margin: 0,
                        }}
                      >
                        {invoice.invoice_number}
                      </h2>
                    </div>
                    <span style={{ paddingTop: '0.35rem' }}>
                      <StatusTag color={STATUS_COLOR[visibleStatus]}>
                        {STATUS_LABEL[visibleStatus]}
                      </StatusTag>
                    </span>
                  </div>

                  {/* Project */}
                  {projectTitle && (
                    <p
                      style={{
                        margin: '0 0 1.4rem',
                        fontFamily: PORTAL.mono,
                        fontSize: '0.62rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: PORTAL.muted,
                      }}
                    >
                      Proyecto&nbsp;&middot;{' '}
                      <span style={{ color: PORTAL.strong }}>{projectTitle}</span>
                    </p>
                  )}

                  {/* Amount + due date */}
                  <div
                    className="flex items-baseline justify-between gap-4"
                    style={{
                      flexWrap: 'wrap',
                      borderTop: `1px solid ${PORTAL.border}`,
                      paddingTop: '1.2rem',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: PORTAL.serif,
                        fontWeight: 500,
                        fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
                        lineHeight: 1,
                        letterSpacing: '-0.01em',
                        color: PORTAL.cream,
                      }}
                    >
                      {formatCurrency(Number(invoice.amount), invoice.currency)}
                    </span>
                    {invoice.due_date && (
                      <span
                        style={{
                          fontFamily: PORTAL.mono,
                          fontSize: '0.6rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: PORTAL.dim,
                        }}
                      >
                        Vence&nbsp;&middot;{' '}
                        <span
                          style={{
                            color: visibleStatus === 'overdue' ? PORTAL.accent : PORTAL.muted,
                          }}
                        >
                          {formatDate(invoice.due_date)}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Descargar PDF */}
                  <div style={{ marginTop: '1.2rem' }}>
                    <a
                      href={`/api/invoices/${invoice.id}/pdf?download=1`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontFamily: PORTAL.mono,
                        fontSize: '0.62rem',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: PORTAL.muted,
                        textDecoration: 'none',
                        borderBottom: `1px solid ${PORTAL.border}`,
                        paddingBottom: '0.2rem',
                      }}
                    >
                      <Download size={13} strokeWidth={1.5} />
                      Descargar PDF
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </PortalShell>
  )
}
