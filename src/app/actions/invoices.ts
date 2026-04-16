'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

// ── Invoice status type ────────────────────────────────────────────────────────
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

// ── Create invoice ─────────────────────────────────────────────────────────────
export async function createInvoice(formData: FormData): Promise<{ error?: string }> {
  const db = createServiceClient()

  const client_id = String(formData.get('client_id') ?? '').trim() || null
  const project_id = String(formData.get('project_id') ?? '').trim() || null
  const amountRaw = String(formData.get('amount') ?? '').trim()
  const amount = amountRaw ? parseFloat(amountRaw) : null
  const currency = String(formData.get('currency') ?? 'MXN').trim()
  const due_date = String(formData.get('due_date') ?? '').trim() || null
  const notes = String(formData.get('notes') ?? '').trim() || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('invoices').insert({
    client_id,
    project_id,
    amount,
    currency,
    due_date,
    notes,
    status: 'draft',
  })

  if (error) return { error: (error as { message: string }).message }
  revalidatePath('/admin/invoices')
  return {}
}

// ── Update invoice status ──────────────────────────────────────────────────────
export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<{ error?: string }> {
  const db = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('invoices').update({ status }).eq('id', id)

  if (error) return { error: (error as { message: string }).message }
  revalidatePath('/admin/invoices')
  return {}
}

// ── Delete invoice ─────────────────────────────────────────────────────────────
export async function deleteInvoice(id: string): Promise<{ error?: string }> {
  const db = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('invoices').delete().eq('id', id)

  if (error) return { error: (error as { message: string }).message }
  revalidatePath('/admin/invoices')
  return {}
}
