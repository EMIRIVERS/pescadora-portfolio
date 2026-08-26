'use server'

// Gastos generales del negocio (tabla public.business_expenses).
// Migración: supabase/migrations/20260618000000_business_expenses_equipment.sql

import { revalidatePath } from 'next/cache'
import { createServiceClient, requireRole } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import type { BusinessExpense, BusinessExpenseStatus } from '@/lib/supabase/types'

export interface BusinessExpenseInput {
  label: string
  amount: number
  currency: string
  category: string | null
  vendor: string | null
  paymentMethod: string | null
  status: BusinessExpenseStatus
  date: string
  projectId: string | null
  receiptUrl: string | null
  notes: string | null
}

export async function getBusinessExpenses(): Promise<BusinessExpense[]> {
  const auth = await requireRole('expenses', 'view')
  if ('error' in auth) return []
  const db = createServiceClient()
  const { data } = await db
    .from('business_expenses')
    .select('*')
    .order('date', { ascending: false })
  return (data ?? []) as BusinessExpense[]
}

export async function createBusinessExpense(
  input: BusinessExpenseInput,
): Promise<{ data?: BusinessExpense; error?: string }> {
  const auth = await requireRole('expenses', 'create')
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { data, error } = await db
    .from('business_expenses')
    .insert({
      label: input.label,
      amount: input.amount,
      currency: input.currency,
      category: input.category,
      vendor: input.vendor,
      payment_method: input.paymentMethod,
      status: input.status,
      date: input.date,
      project_id: input.projectId,
      receipt_url: input.receiptUrl,
      notes: input.notes,
    })
    .select('*')
    .single()

  if (error || !data) return { error: error?.message ?? 'No se pudo registrar el gasto.' }

  await logAudit({
    action: 'business_expense.create',
    actorId: auth.userId,
    entityType: 'business_expense',
    entityId: data.id,
    summary: `Gasto registrado: ${input.label}`,
  })

  revalidatePath('/admin/gastos')
  return { data }
}

export async function updateBusinessExpense(
  id: string,
  input: BusinessExpenseInput,
): Promise<{ data?: BusinessExpense; error?: string }> {
  const auth = await requireRole('expenses', 'update')
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { data, error } = await db
    .from('business_expenses')
    .update({
      label: input.label,
      amount: input.amount,
      currency: input.currency,
      category: input.category,
      vendor: input.vendor,
      payment_method: input.paymentMethod,
      status: input.status,
      date: input.date,
      project_id: input.projectId,
      receipt_url: input.receiptUrl,
      notes: input.notes,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) return { error: error?.message ?? 'No se pudo actualizar el gasto.' }

  await logAudit({
    action: 'business_expense.update',
    actorId: auth.userId,
    entityType: 'business_expense',
    entityId: id,
    summary: `Gasto actualizado: ${input.label}`,
  })

  revalidatePath('/admin/gastos')
  return { data }
}

export async function deleteBusinessExpense(id: string): Promise<{ error?: string }> {
  const auth = await requireRole('expenses', 'delete')
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { error } = await db.from('business_expenses').delete().eq('id', id)
  if (error) return { error: error.message }
  await logAudit({
    action: 'business_expense.delete',
    actorId: auth.userId,
    entityType: 'business_expense',
    entityId: id,
    summary: 'Gasto eliminado',
  })
  revalidatePath('/admin/gastos')
  return {}
}
