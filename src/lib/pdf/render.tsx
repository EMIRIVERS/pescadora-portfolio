/**
 * src/lib/pdf/render.tsx
 *
 * Render server-side de facturas/cotizaciones a PDF (Buffer) + mappers desde las
 * filas de Supabase hacia la forma normalizada `BillingPdfData`. Server-only:
 * importa @react-pdf/renderer, que corre en runtime Node (nunca Edge/cliente).
 */
import { renderToBuffer } from '@react-pdf/renderer'
import type { QuoteLine, FiscalData } from '@/lib/billing/catalog'
import type { TaxBreakdown } from '@/lib/billing/tax'
import { BillingDocument, type BillingPdfData } from './billing-document'

// ── Filas crudas (subconjunto de columnas que el PDF necesita) ─────────────────

export interface InvoicePdfRow {
  invoice_number: string
  amount: number
  currency: string | null
  status: string
  issue_date: string | null
  due_date: string | null
  notes: string | null
  items: QuoteLine[] | null
  subtotal: number | null
  tax: TaxBreakdown | null
  fiscal_data: FiscalData | null
  clients: { name: string; email: string | null; company: string | null } | null
  projects: { title: string } | null
}

export interface ProposalPdfRow {
  id: string
  title: string | null
  currency: string | null
  status: string
  created_at: string
  valid_until: string | null
  notes: string | null
  items: QuoteLine[] | null
  subtotal: number | null
  tax: TaxBreakdown | null
  total: number | null
  fiscal_data: FiscalData | null
  clients: { name: string; email: string | null; company: string | null } | null
}

// ── Estado → etiqueta/color (hex literal: react-pdf no resuelve CSS vars) ───────

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: '#888888' },
  sent: { label: 'Enviada', color: '#0071E3' },
  paid: { label: 'Pagada', color: '#30D158' },
  overdue: { label: 'Vencida', color: '#FF453A' },
  cancelled: { label: 'Cancelada', color: '#999999' },
}

const PROPOSAL_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: '#888888' },
  sent: { label: 'Enviada', color: '#0071E3' },
  accepted: { label: 'Aceptada', color: '#30D158' },
  rejected: { label: 'Rechazada', color: '#FF453A' },
}

function fallbackTotals(subtotal: number | null, total: number, tax: TaxBreakdown | null): TaxBreakdown {
  if (tax) return tax
  const s = subtotal ?? total
  return { subtotal: s, iva: 0, total }
}

/** Referencia legible para una cotización (no tiene folio propio). */
export function proposalReference(id: string): string {
  return `COT-${id.slice(0, 8).toUpperCase()}`
}

// ── Mappers ────────────────────────────────────────────────────────────────────

export function invoiceToPdfData(row: InvoicePdfRow): BillingPdfData {
  const status = INVOICE_STATUS[row.status] ?? { label: row.status, color: '#888888' }
  return {
    kind: 'invoice',
    reference: row.invoice_number,
    title: null,
    statusLabel: status.label,
    statusColor: status.color,
    issueDate: row.issue_date,
    secondaryDate: row.due_date,
    secondaryDateLabel: 'Fecha de vencimiento',
    currency: row.currency ?? 'MXN',
    recipient: {
      name: row.clients?.name ?? null,
      company: row.clients?.company ?? null,
      email: row.clients?.email ?? null,
    },
    projectTitle: row.projects?.title ?? null,
    fiscal: row.fiscal_data,
    items: Array.isArray(row.items) ? row.items : [],
    totals: fallbackTotals(row.subtotal, Number(row.amount), row.tax),
    notes: row.notes,
  }
}

export function proposalToPdfData(row: ProposalPdfRow): BillingPdfData {
  const status = PROPOSAL_STATUS[row.status] ?? { label: row.status, color: '#888888' }
  return {
    kind: 'quote',
    reference: proposalReference(row.id),
    title: row.title,
    statusLabel: status.label,
    statusColor: status.color,
    issueDate: row.created_at,
    secondaryDate: row.valid_until,
    secondaryDateLabel: 'Válida hasta',
    currency: row.currency ?? 'MXN',
    recipient: {
      name: row.clients?.name ?? null,
      company: row.clients?.company ?? null,
      email: row.clients?.email ?? null,
    },
    projectTitle: null,
    fiscal: row.fiscal_data,
    items: Array.isArray(row.items) ? row.items : [],
    totals: fallbackTotals(row.subtotal, Number(row.total ?? 0), row.tax),
    notes: row.notes,
  }
}

// ── Render ───────────────────────────────────────────────────────────────────

/** Nombre de archivo sugerido para el PDF. */
export function billingFilename(data: BillingPdfData): string {
  const base = data.kind === 'invoice' ? data.reference : `Cotizacion-${data.reference}`
  return `${base.replace(/[^a-zA-Z0-9_-]+/g, '-')}.pdf`
}

export async function renderBillingPdf(data: BillingPdfData): Promise<Buffer> {
  return renderToBuffer(<BillingDocument data={data} />)
}
