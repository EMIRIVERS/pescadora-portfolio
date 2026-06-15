import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import PrintButton from './PrintButton'
import InvoiceActions from './InvoiceActions'
import type { QuoteLine, FiscalData } from '@/lib/billing/catalog'
import type { TaxBreakdown } from '@/lib/billing/tax'

const FONT = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

/** Acento de marca XICO (rojo). Literal para que sea estable en impresión/PDF. */
const XICO_RED = '#e8341a'

interface InvoiceRow {
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
  items: QuoteLine[] | null
  subtotal: number | null
  tax: TaxBreakdown | null
  fiscal_data: FiscalData | null
  clients: { name: string; email: string | null; company: string | null } | null
  projects: { title: string } | null
}

function fmt(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  paid: 'Pagada',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'var(--dash-text-secondary)',
  sent: '#0071E3',
  paid: '#30D158',
  overdue: '#FF453A',
  cancelled: 'var(--dash-text-tertiary)',
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('invoices')
    .select('*, clients(name, email, company), projects(title)')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const inv = data as InvoiceRow
  const statusColor = STATUS_COLOR[inv.status] ?? 'var(--dash-text-secondary)'
  const statusLabel = STATUS_LABEL[inv.status] ?? inv.status

  // Líneas de concepto (CFDI). Si la factura no las tiene, se cae al render legacy.
  const lineRows: QuoteLine[] = Array.isArray(inv.items) ? inv.items : []
  // Desglose fiscal: usa el TaxBreakdown guardado; si no existe (facturas legacy),
  // trata el monto como total sin impuestos desglosados.
  const totals = inv.tax ?? {
    subtotal: Number(inv.amount),
    iva: 0,
    total: Number(inv.amount),
  }

  return (
    <>
      {/* Print styles injected inline so they are always available */}
      <style>{`
        @media print {
          .invoice-no-print { display: none !important; }
          .admin-root > div > div:first-child { display: none !important; }
          .sidebar-wrapper { display: none !important; }
          .mobile-nav-trigger { display: none !important; }
          body { background: #ffffff !important; color: #000000 !important; }
          .invoice-print-content {
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
        @page {
          size: A4;
          margin: 20mm 18mm;
        }
      `}</style>

      <div style={{ fontFamily: FONT, maxWidth: 900, margin: '0 auto' }}>
        {/* Toolbar — hidden on print */}
        <div
          className="invoice-no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 28,
          }}
        >
          <Link
            href="/admin/invoices"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              backgroundColor: 'var(--dash-surface-2)',
              border: '1px solid var(--dash-border)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--dash-text-secondary)',
              textDecoration: 'none',
              fontFamily: FONT,
            }}
          >
            &larr; Volver a facturas
          </Link>
          <InvoiceActions id={inv.id} invoiceNumber={inv.invoice_number} status={inv.status} />
          <PrintButton />
        </div>

        {/* Invoice document */}
        <div
          className="invoice-print-content"
          style={{
            position: 'relative',
            backgroundColor: '#ffffff',
            color: '#1a1a1a',
            borderRadius: 16,
            padding: '48px 56px',
            boxShadow: 'var(--dash-shadow-lg)',
            overflow: 'hidden',
          }}
        >
          {/* Filete de marca XICO — acento rojo en el borde superior del documento (print-safe) */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: XICO_RED,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          />
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 48,
              borderBottom: '2px solid #1a1a1a',
              paddingBottom: 32,
            }}
          >
            {/* Company info */}
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#1a1a1a',
                  fontFamily: FONT,
                }}
              >
                <span style={{ color: XICO_RED, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>XICO</span> FILMS
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555', fontFamily: FONT }}>
                Producción audiovisual
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#555', fontFamily: FONT }}>
                México
              </p>
            </div>

            {/* Invoice meta */}
            <div style={{ textAlign: 'right' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: '#1a1a1a',
                  fontFamily: FONT,
                }}
              >
                FACTURA
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#333',
                  fontFamily: FONT,
                }}
              >
                {inv.invoice_number}
              </p>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 8,
                  padding: '3px 12px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase' as const,
                  backgroundColor: statusColor + '22',
                  color: statusColor,
                  border: `1px solid ${statusColor}44`,
                  fontFamily: FONT,
                }}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Dates + Recipient */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 40,
              marginBottom: 48,
            }}
          >
            {/* Recipient */}
            <div>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: '#888',
                  fontFamily: FONT,
                }}
              >
                Facturado a
              </p>
              {inv.clients ? (
                <>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#1a1a1a',
                      fontFamily: FONT,
                    }}
                  >
                    {inv.clients.name}
                  </p>
                  {inv.clients.company && (
                    <p style={{ margin: '4px 0 0', fontSize: 14, color: '#333', fontFamily: FONT }}>
                      {inv.clients.company}
                    </p>
                  )}
                  {inv.clients.email && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555', fontFamily: FONT }}>
                      {inv.clients.email}
                    </p>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 14, color: '#888', fontFamily: FONT }}>
                  Sin cliente asignado
                </p>
              )}
              {inv.projects && (
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#555', fontFamily: FONT }}>
                  Proyecto: {inv.projects.title}
                </p>
              )}

              {/* Datos fiscales (CFDI) — solo si están presentes */}
              {inv.fiscal_data && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e5e5' }}>
                  <p
                    style={{
                      margin: '0 0 8px',
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                      color: '#888',
                      fontFamily: FONT,
                    }}
                  >
                    Datos fiscales
                  </p>
                  {inv.fiscal_data.razonSocial && (
                    <p style={{ margin: '0 0 2px', fontSize: 13, color: '#1a1a1a', fontFamily: FONT }}>
                      {inv.fiscal_data.razonSocial}
                    </p>
                  )}
                  {inv.fiscal_data.rfc && (
                    <p style={{ margin: '0 0 2px', fontSize: 13, color: '#555', fontFamily: FONT }}>
                      RFC: {inv.fiscal_data.rfc}
                    </p>
                  )}
                  {inv.fiscal_data.regimenFiscal && (
                    <p style={{ margin: '0 0 2px', fontSize: 13, color: '#555', fontFamily: FONT }}>
                      Régimen fiscal: {inv.fiscal_data.regimenFiscal}
                    </p>
                  )}
                  {inv.fiscal_data.usoCfdi && (
                    <p style={{ margin: '0 0 2px', fontSize: 13, color: '#555', fontFamily: FONT }}>
                      Uso de CFDI: {inv.fiscal_data.usoCfdi}
                    </p>
                  )}
                  {inv.fiscal_data.codigoPostal && (
                    <p style={{ margin: '0 0 2px', fontSize: 13, color: '#555', fontFamily: FONT }}>
                      Código postal: {inv.fiscal_data.codigoPostal}
                    </p>
                  )}
                  {inv.fiscal_data.emailFacturacion && (
                    <p style={{ margin: '0 0 2px', fontSize: 13, color: '#555', fontFamily: FONT }}>
                      {inv.fiscal_data.emailFacturacion}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Dates */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: 12 }}>
                <p
                  style={{
                    margin: '0 0 2px',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    color: '#888',
                    fontFamily: FONT,
                  }}
                >
                  Fecha de emisión
                </p>
                <p style={{ margin: 0, fontSize: 14, color: '#1a1a1a', fontFamily: FONT }}>
                  {fmtDate(inv.issue_date)}
                </p>
              </div>
              {inv.due_date && (
                <div>
                  <p
                    style={{
                      margin: '0 0 2px',
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                      color: '#888',
                      fontFamily: FONT,
                    }}
                  >
                    Fecha de vencimiento
                  </p>
                  <p style={{ margin: 0, fontSize: 14, color: '#1a1a1a', fontFamily: FONT }}>
                    {fmtDate(inv.due_date)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: 0,
              fontFamily: FONT,
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#1a1a1a',
                  color: '#ffffff',
                }}
              >
                {['Descripción', 'Cantidad', 'Precio unitario', 'Total'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase' as const,
                      textAlign: i === 0 ? 'left' : ('right' as const),
                      fontFamily: FONT,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineRows.length > 0 ? (
                lineRows.map((line) => (
                  <tr key={line.id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                    <td style={{ padding: '16px', fontSize: 14, color: '#1a1a1a', fontFamily: FONT }}>
                      {line.name}
                    </td>
                    <td style={{ padding: '16px', fontSize: 14, color: '#1a1a1a', textAlign: 'right', fontFamily: FONT }}>
                      {line.qty}
                    </td>
                    <td style={{ padding: '16px', fontSize: 14, color: '#1a1a1a', textAlign: 'right', fontFamily: FONT }}>
                      {fmt(line.unitPrice, inv.currency)}
                    </td>
                    <td style={{ padding: '16px', fontSize: 14, fontWeight: 600, color: '#1a1a1a', textAlign: 'right', fontFamily: FONT }}>
                      {fmt(line.unitPrice * line.qty, inv.currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
                  <td style={{ padding: '16px', fontSize: 14, color: '#1a1a1a', fontFamily: FONT }}>
                    {inv.projects
                      ? `Servicios de producción — ${inv.projects.title}`
                      : 'Servicios de producción audiovisual'}
                  </td>
                  <td style={{ padding: '16px', fontSize: 14, color: '#1a1a1a', textAlign: 'right', fontFamily: FONT }}>1</td>
                  <td style={{ padding: '16px', fontSize: 14, color: '#1a1a1a', textAlign: 'right', fontFamily: FONT }}>
                    {fmt(Number(inv.amount), inv.currency)}
                  </td>
                  <td style={{ padding: '16px', fontSize: 14, fontWeight: 600, color: '#1a1a1a', textAlign: 'right', fontFamily: FONT }}>
                    {fmt(Number(inv.amount), inv.currency)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 0,
              borderTop: '2px solid #1a1a1a',
              paddingTop: 16,
            }}
          >
            <div style={{ minWidth: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px', fontSize: 13, color: '#555', fontFamily: FONT }}>
                <span>Subtotal</span>
                <span>{fmt(totals.subtotal, inv.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px', fontSize: 13, color: '#555', fontFamily: FONT }}>
                <span>IVA (16%)</span>
                <span>{fmt(totals.iva, inv.currency)}</span>
              </div>
              {totals.retIsr != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px', fontSize: 13, color: '#b91c1c', fontFamily: FONT }}>
                  <span>Ret. ISR (10%)</span>
                  <span>- {fmt(totals.retIsr, inv.currency)}</span>
                </div>
              )}
              {totals.retIva != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px', fontSize: 13, color: '#b91c1c', fontFamily: FONT }}>
                  <span>Ret. IVA (10.666%)</span>
                  <span>- {fmt(totals.retIva, inv.currency)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#1a1a1a', color: '#ffffff', fontFamily: FONT, marginTop: 4, borderLeft: `4px solid ${XICO_RED}`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>TOTAL</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>
                  {fmt(totals.total, inv.currency)} {inv.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {inv.notes && (
            <div
              style={{
                marginTop: 40,
                padding: '20px 24px',
                backgroundColor: '#f5f5f5',
                borderRadius: 8,
                borderLeft: '3px solid #1a1a1a',
              }}
            >
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: '#888',
                  fontFamily: FONT,
                }}
              >
                Notas
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#333', lineHeight: 1.6, fontFamily: FONT }}>
                {inv.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 48,
              paddingTop: 24,
              borderTop: '1px solid #e5e5e5',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                margin: '0 0 6px',
                fontSize: 14,
                fontWeight: 600,
                color: '#1a1a1a',
                fontFamily: FONT,
              }}
            >
              Gracias por confiar en nosotros.
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#888', fontFamily: FONT }}>
              Términos de pago: 30 días neto a partir de la fecha de emisión.
              Para consultas sobre esta factura contacte a hola@xicofilms.com
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
