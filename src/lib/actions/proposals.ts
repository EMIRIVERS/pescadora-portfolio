'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient, requireAdmin } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import type { QuoteLine, ClientType, FiscalData } from '@/lib/billing/catalog'
import { sumLineItems, calcTaxBreakdown, type TaxBreakdown } from '@/lib/billing/tax'
import { formatMoney } from '@/lib/billing/format'
import { sendEmail } from '@/lib/email'
import { proposalEmailTemplate } from '@/lib/email/templates'
import { renderBillingPdf, proposalToPdfData, billingFilename, type ProposalPdfRow } from '@/lib/pdf/render'
import type { Json } from '@/lib/supabase/types'

export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

// Compat: el shape antiguo era { name, qty, unit_price }. El nuevo es QuoteLine.
export type ProposalItem = QuoteLine

export interface Proposal {
  id: string
  client_id: string | null
  lead_id: string | null
  title: string
  description: string | null
  items: QuoteLine[]
  client_type: ClientType
  subtotal: number
  tax: TaxBreakdown | null
  total: number
  currency: string
  status: ProposalStatus
  valid_until: string | null
  fiscal_data: FiscalData | null
  notes: string | null
  created_at: string
  updated_at: string
  clients: { name: string } | null
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getProposals(): Promise<Proposal[]> {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const db = createServiceClient()
  const { data, error } = await db
    .from('proposals')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  // Cast: items/tax/fiscal_data se persisten como Json pero su shape real es
  // QuoteLine[] / TaxBreakdown / FiscalData (interfaces del dominio billing).
  return (data ?? []) as unknown as Proposal[]
}

// ─── Create / Update payload ──────────────────────────────────────────────────

export interface ProposalInput {
  title: string
  description: string
  items: QuoteLine[]
  client_type: ClientType
  /** Aplicar retenciones ISR + IVA (CFDI servicios profesionales). */
  applyRetenciones: boolean
  currency: string
  client_id: string | null
  lead_id: string | null
  valid_until: string | null
  fiscal_data: FiscalData | null
  notes: string
  status: ProposalStatus
}

/** Recalcula subtotal/impuestos/total en el servidor (no se confía en el cliente). */
function computeTotals(items: QuoteLine[], applyRetenciones: boolean) {
  const subtotal = sumLineItems(items)
  const tax = calcTaxBreakdown(
    subtotal,
    applyRetenciones ? { applyRetIsr: true, applyRetIva: true } : {},
  )
  return { subtotal, tax, total: tax.total }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProposal(data: ProposalInput): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  if (!data.title.trim()) return { error: 'El título es obligatorio.' }
  if (data.items.length === 0) return { error: 'Agrega al menos un servicio.' }

  const db = createServiceClient()
  const { subtotal, tax, total } = computeTotals(data.items, data.applyRetenciones)

  const { error } = await db.from('proposals').insert({
    title: data.title.trim(),
    description: data.description.trim() || null,
    items: data.items as unknown as Json,
    client_type: data.client_type,
    subtotal,
    tax: tax as unknown as Json,
    total,
    currency: data.currency || 'MXN',
    client_id: data.client_id || null,
    lead_id: data.lead_id || null,
    valid_until: data.valid_until || null,
    fiscal_data: data.fiscal_data as unknown as Json | null,
    notes: data.notes.trim() || null,
    status: data.status || 'draft',
  })

  if (error) return { error: error.message }
  await logAudit({
    action: 'proposal.create',
    actorId: auth.userId,
    entityType: 'proposal',
    entityId: null,
    summary: `Cotización creada: ${data.title.trim()}`,
  })
  revalidatePath('/admin/proposals')
  return {}
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProposal(
  id: string,
  data: ProposalInput,
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  if (!data.title.trim()) return { error: 'El título es obligatorio.' }
  if (data.items.length === 0) return { error: 'Agrega al menos un servicio.' }

  const db = createServiceClient()
  const { subtotal, tax, total } = computeTotals(data.items, data.applyRetenciones)

  const { error } = await db
    .from('proposals')
    .update({
      title: data.title.trim(),
      description: data.description.trim() || null,
      items: data.items as unknown as Json,
      client_type: data.client_type,
      subtotal,
      tax: tax as unknown as Json,
      total,
      currency: data.currency || 'MXN',
      client_id: data.client_id || null,
      lead_id: data.lead_id || null,
      valid_until: data.valid_until || null,
      fiscal_data: data.fiscal_data as unknown as Json | null,
      notes: data.notes.trim() || null,
      status: data.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }
  await logAudit({
    action: 'proposal.update',
    actorId: auth.userId,
    entityType: 'proposal',
    entityId: id,
    summary: `Cotización actualizada: ${data.title.trim()}`,
  })
  revalidatePath('/admin/proposals')
  return {}
}

// ─── Status only ──────────────────────────────────────────────────────────────

export async function updateProposalStatus(
  id: string,
  status: ProposalStatus,
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { error } = await db
    .from('proposals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  await logAudit({
    action: 'proposal.status',
    actorId: auth.userId,
    entityType: 'proposal',
    entityId: id,
    summary: `Estado de cotización cambiado a ${status}`,
  })
  if (status === 'accepted') {
    await notify({ title: 'Cotización aceptada', body: 'Un cliente aceptó una cotización. Genera la factura desde la cotización.', type: 'success', entityType: 'proposal', entityId: id })
  }
  revalidatePath('/admin/proposals')
  return {}
}

// ─── Enviar cotización por email (PDF adjunto) ────────────────────────────────

function fmtLongDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function sendProposalEmail(id: string): Promise<{ error?: string; sentTo?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('proposals')
    .select('id, title, currency, status, created_at, valid_until, notes, items, subtotal, tax, total, fiscal_data, clients(name, email, company), leads(name, email)')
    .eq('id', id)
    .single()
  if (error || !data) return { error: 'No se encontró la cotización.' }

  // El destinatario puede venir de un cliente o de un lead.
  const lead = (data.leads ?? null) as { name: string | null; email: string | null } | null
  const client = (data.clients ?? null) as { name: string; email: string | null; company: string | null } | null
  const to = client?.email ?? lead?.email ?? data.fiscal_data?.emailFacturacion ?? null
  if (!to) return { error: 'El destinatario de esta cotización no tiene email (ni cliente ni lead).' }

  const row = data as ProposalPdfRow
  // Si no hay cliente vinculado pero sí un lead, mostramos al lead como receptor del PDF.
  if (!row.clients && lead) {
    row.clients = { name: lead.name ?? 'Prospecto', email: lead.email, company: null }
  }

  const pdfData = proposalToPdfData(row)
  const pdf = await renderBillingPdf(pdfData)

  await sendEmail({
    to,
    subject: `Cotización: ${row.title ?? pdfData.reference} — XICO Films`,
    html: proposalEmailTemplate({
      recipientName: client?.name ?? lead?.name ?? null,
      title: row.title ?? pdfData.reference,
      total: formatMoney(Number(row.total ?? 0), row.currency ?? 'MXN'),
      validUntil: fmtLongDate(row.valid_until),
    }),
    attachments: [{ filename: billingFilename(pdfData), content: pdf.toString('base64') }],
  })

  // Enviarla la marca como "enviada" si seguía en borrador.
  if (row.status === 'draft') {
    await db.from('proposals').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', id)
  }

  await logAudit({
    action: 'proposal.email',
    actorId: auth.userId,
    entityType: 'proposal',
    entityId: id,
    summary: `Cotización ${pdfData.reference} enviada por email a ${to}`,
  })
  revalidatePath('/admin/proposals')
  return { sentTo: to }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteProposal(id: string): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { error } = await db.from('proposals').delete().eq('id', id)
  if (error) return { error: error.message }
  await logAudit({
    action: 'proposal.delete',
    actorId: auth.userId,
    entityType: 'proposal',
    entityId: id,
    summary: 'Cotización eliminada',
  })
  revalidatePath('/admin/proposals')
  return {}
}
