'use server'

// ---------------------------------------------------------------------------
// SQL — run once in Supabase SQL editor
// ---------------------------------------------------------------------------
// create table if not exists public.project_expenses (
//   id          uuid primary key default gen_random_uuid(),
//   project_id  uuid not null references public.projects(id) on delete cascade,
//   created_at  timestamptz not null default now(),
//   label       text not null,
//   amount      numeric(12,2) not null check (amount >= 0),
//   category    text,
//   notes       text,
//   date        date
// );
// alter table public.project_expenses enable row level security;
// create policy "admin_all" on public.project_expenses
//   for all using (
//     exists (select 1 from public.profiles where id = auth.uid() and is_admin_team = true)
//   );
// ---------------------------------------------------------------------------

import { revalidatePath } from 'next/cache'
import { createServiceClient, requireAdmin } from '@/lib/supabase/server'
import type { ProjectExpense } from '@/lib/supabase/types'

export interface CreateExpenseInput {
  projectId: string
  label: string
  amount: number
  category: string | null
  notes: string | null
  date: string | null
}

export async function getExpenses(projectId: string): Promise<ProjectExpense[]> {
  const auth = await requireAdmin()
  if ('error' in auth) return []
  const db = createServiceClient()
  const { data } = await db
    .from('project_expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false })
  return (data ?? []) as ProjectExpense[]
}

export async function createExpense(
  input: CreateExpenseInput,
): Promise<{ data?: ProjectExpense; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { data, error } = await db
    .from('project_expenses')
    .insert({
      project_id: input.projectId,
      label: input.label,
      amount: input.amount,
      category: input.category,
      notes: input.notes,
      date: input.date,
    })
    .select('*')
    .single()

  if (error || !data) return { error: error?.message ?? 'No se pudo registrar el gasto.' }

  revalidatePath(`/admin/projects/${input.projectId}`)
  return { data: data as ProjectExpense }
}

export async function deleteExpense(
  expenseId: string,
  projectId: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { error } = await db.from('project_expenses').delete().eq('id', expenseId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/projects/${projectId}`)
  return {}
}
