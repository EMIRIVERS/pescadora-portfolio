'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient, requireAdmin } from '@/lib/supabase/server'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export async function getInvoices() {
  const auth = await requireAdmin()
  if ('error' in auth) return []
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('invoices')
    .select('*, clients(name), projects(title)')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createInvoice(formData: FormData): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const invoice_number = String(formData.get('invoice_number') ?? '').trim()
  if (!invoice_number) return { error: 'El número de factura es obligatorio.' }

  const amount = parseFloat(String(formData.get('amount') ?? '0'))
  if (isNaN(amount) || amount < 0) return { error: 'El monto debe ser un número válido.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('invoices').insert({
    invoice_number,
    amount,
    currency: String(formData.get('currency') ?? 'MXN').trim() || 'MXN',
    status: String(formData.get('status') ?? 'draft').trim() || 'draft',
    client_id: String(formData.get('client_id') ?? '').trim() || null,
    project_id: String(formData.get('project_id') ?? '').trim() || null,
    issue_date: String(formData.get('issue_date') ?? '').trim() || null,
    due_date: String(formData.get('due_date') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/invoices')
  return {}
}

export async function updateInvoice(id: string, formData: FormData): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const amount = parseFloat(String(formData.get('amount') ?? '0'))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('invoices').update({
    invoice_number: String(formData.get('invoice_number') ?? '').trim(),
    amount: isNaN(amount) ? 0 : amount,
    currency: String(formData.get('currency') ?? 'MXN').trim() || 'MXN',
    status: String(formData.get('status') ?? 'draft').trim(),
    client_id: String(formData.get('client_id') ?? '').trim() || null,
    project_id: String(formData.get('project_id') ?? '').trim() || null,
    issue_date: String(formData.get('issue_date') ?? '').trim() || null,
    due_date: String(formData.get('due_date') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/invoices')
  return {}
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/invoices')
  return {}
}

export async function deleteInvoice(id: string): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('invoices').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/invoices')
  return {}
}
