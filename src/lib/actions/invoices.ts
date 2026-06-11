'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient, requireRole } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import type { QuoteLine, ClientType, FiscalData } from '@/lib/billing/catalog'
import { sumLineItems, calcTaxBreakdown } from '@/lib/billing/tax'
import type { Json } from '@/lib/supabase/types'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export async function getInvoices() {
  const auth = await requireRole('invoices', 'view')
  if ('error' in auth) return []
  const db = createServiceClient()
  const { data, error } = await db
    .from('invoices')
    .select('*, clients(name), projects(title)')
  if (error) throw new Error(error.message)
  return data ?? []
}

export interface InvoiceInput {
  invoice_number: string
  title: string
  items: QuoteLine[]
  client_type: ClientType
  /** Aplicar retenciones ISR + IVA (CFDI servicios profesionales). */
  applyRetenciones: boolean
  currency: string
  status: InvoiceStatus
  client_id: string | null
  project_id: string | null
  issue_date: string | null
  due_date: string | null
  fiscal_data: FiscalData | null
  notes: string
}

/** Recalcula subtotal/impuestos/total en el servidor. */
function computeTotals(items: QuoteLine[], applyRetenciones: boolean) {
  const subtotal = sumLineItems(items)
  const tax = calcTaxBreakdown(
    subtotal,
    applyRetenciones ? { applyRetIsr: true, applyRetIva: true } : {},
  )
  return { subtotal, tax, total: tax.total }
}

export async function createInvoice(data: InvoiceInput): Promise<{ error?: string; invoiceId?: string }> {
  const auth = await requireRole('invoices', 'create')
  if ('error' in auth) return { error: auth.error }
  if (!data.invoice_number.trim()) return { error: 'El número de factura es obligatorio.' }
  if (data.items.length === 0) return { error: 'Agrega al menos un servicio.' }

  const db = createServiceClient()
  const { subtotal, tax, total } = computeTotals(data.items, data.applyRetenciones)

  const { data: inserted, error } = await db
    .from('invoices')
    .insert({
      invoice_number: data.invoice_number.trim(),
      title: data.title.trim() || null,
      items: data.items as unknown as Json,
      subtotal,
      tax: tax as unknown as Json,
      amount: total,
      currency: data.currency || 'MXN',
      client_type: data.client_type,
      status: data.status || 'draft',
      client_id: data.client_id || null,
      project_id: data.project_id || null,
      issue_date: data.issue_date || undefined,
      due_date: data.due_date || null,
      fiscal_data: data.fiscal_data as unknown as Json | null,
      notes: data.notes.trim() || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  await logAudit({
    action: 'invoice.create',
    actorId: auth.userId,
    entityType: 'invoice',
    entityId: inserted?.id ?? null,
    summary: `Factura creada: ${data.invoice_number.trim()}`,
  })
  revalidatePath('/admin/invoices')
  return { invoiceId: inserted?.id }
}

export async function updateInvoice(id: string, data: InvoiceInput): Promise<{ error?: string }> {
  const auth = await requireRole('invoices', 'update')
  if ('error' in auth) return { error: auth.error }
  if (!data.invoice_number.trim()) return { error: 'El número de factura es obligatorio.' }
  if (data.items.length === 0) return { error: 'Agrega al menos un servicio.' }

  const db = createServiceClient()
  const { subtotal, tax, total } = computeTotals(data.items, data.applyRetenciones)

  const { error } = await db
    .from('invoices')
    .update({
      invoice_number: data.invoice_number.trim(),
      title: data.title.trim() || null,
      items: data.items as unknown as Json,
      subtotal,
      tax: tax as unknown as Json,
      amount: total,
      currency: data.currency || 'MXN',
      client_type: data.client_type,
      status: data.status,
      client_id: data.client_id || null,
      project_id: data.project_id || null,
      issue_date: data.issue_date || undefined,
      due_date: data.due_date || null,
      fiscal_data: data.fiscal_data as unknown as Json | null,
      notes: data.notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }
  await logAudit({
    action: 'invoice.update',
    actorId: auth.userId,
    entityType: 'invoice',
    entityId: id,
    summary: `Factura actualizada: ${data.invoice_number.trim()}`,
  })
  revalidatePath('/admin/invoices')
  revalidatePath(`/admin/invoices/${id}`)
  return {}
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<{ error?: string }> {
  const auth = await requireRole('invoices', 'special')
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { error } = await db
    .from('invoices')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  await logAudit({
    action: 'invoice.status',
    actorId: auth.userId,
    entityType: 'invoice',
    entityId: id,
    summary: `Estado de factura cambiado a ${status}`,
  })
  if (status === 'paid') {
    await notify({ title: 'Factura pagada', body: 'Una factura se marcó como pagada.', type: 'success', entityType: 'invoice', entityId: id })
  } else if (status === 'overdue') {
    await notify({ title: 'Factura vencida', body: 'Una factura quedó marcada como vencida.', type: 'warning', entityType: 'invoice', entityId: id })
  }
  revalidatePath('/admin/invoices')
  return {}
}

export async function deleteInvoice(id: string): Promise<{ error?: string }> {
  const auth = await requireRole('invoices', 'delete')
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { error } = await db.from('invoices').delete().eq('id', id)
  if (error) return { error: error.message }
  await logAudit({
    action: 'invoice.delete',
    actorId: auth.userId,
    entityType: 'invoice',
    entityId: id,
    summary: 'Factura eliminada',
  })
  revalidatePath('/admin/invoices')
  return {}
}

// ─── Generar factura desde una cotización aceptada ────────────────────────────
// Hereda líneas, desglose fiscal y datos del receptor; genera folio automático.

function generateInvoiceNumber(): string {
  const now = new Date()
  const y = now.getFullYear()
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `FAC-${y}-${rand}`
}

export async function createInvoiceFromProposal(
  proposalId: string,
): Promise<{ error?: string; invoiceId?: string }> {
  const auth = await requireRole('invoices', 'create')
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()

  const { data: proposal, error: pErr } = await db
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .single()
  if (pErr || !proposal) return { error: 'No se encontró la cotización.' }

  const total = Number(proposal.total ?? 0)
  const issueDate = new Date().toISOString().slice(0, 10)
  const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const { data: inserted, error } = await db
    .from('invoices')
    .insert({
      invoice_number: generateInvoiceNumber(),
      title: proposal.title ?? null,
      items: proposal.items ?? [],
      subtotal: proposal.subtotal ?? 0,
      tax: proposal.tax ?? null,
      amount: total,
      currency: proposal.currency ?? 'MXN',
      client_type: proposal.client_type ?? 'DIRECTO',
      fiscal_data: proposal.fiscal_data ?? null,
      client_id: proposal.client_id ?? null,
      proposal_id: proposalId,
      status: 'draft',
      issue_date: issueDate,
      due_date: dueDate,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  await logAudit({
    action: 'invoice.from_proposal',
    actorId: auth.userId,
    entityType: 'invoice',
    entityId: inserted?.id ?? null,
    summary: 'Factura generada desde cotización',
    metadata: { proposalId },
  })
  revalidatePath('/admin/invoices')
  revalidatePath('/admin/proposals')
  return { invoiceId: inserted?.id }
}
