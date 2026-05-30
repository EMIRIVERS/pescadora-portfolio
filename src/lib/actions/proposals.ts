'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient, requireAdmin } from '@/lib/supabase/server'

export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export interface ProposalItem {
  name: string
  qty: number
  unit_price: number
}

export interface Proposal {
  id: string
  client_id: string | null
  lead_id: string | null
  title: string
  description: string | null
  items: ProposalItem[]
  total: number
  currency: string
  status: ProposalStatus
  valid_until: string | null
  created_at: string
  updated_at: string
  clients: { name: string } | null
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getProposals(): Promise<Proposal[]> {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('proposals')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Proposal[]
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateProposalData {
  title: string
  description: string
  items: ProposalItem[]
  total: number
  currency: string
  client_id: string | null
  lead_id: string | null
  valid_until: string | null
  status: ProposalStatus
}

export async function createProposal(data: CreateProposalData): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  if (!data.title.trim()) return { error: 'El título es obligatorio.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('proposals').insert({
    title: data.title.trim(),
    description: data.description.trim() || null,
    items: data.items,
    total: data.total,
    currency: data.currency || 'MXN',
    client_id: data.client_id || null,
    lead_id: data.lead_id || null,
    valid_until: data.valid_until || null,
    status: data.status || 'draft',
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/proposals')
  return {}
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProposal(
  id: string,
  data: Partial<CreateProposalData>,
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('proposals')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('proposals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/proposals')
  return {}
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteProposal(id: string): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('proposals').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/proposals')
  return {}
}
