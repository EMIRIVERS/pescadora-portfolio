'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient, requireAdmin } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import type { QuoteLine, ClientType, FiscalData } from '@/lib/billing/catalog'
import { sumLineItems, calcTaxBreakdown, type TaxBreakdown } from '@/lib/billing/tax'
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
