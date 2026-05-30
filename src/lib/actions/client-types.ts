'use server'

import { createServiceClient, requireAdmin } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ClientType {
  id: string
  label: string
  color: string
  sort_order: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any

export async function getAllClientTypes(): Promise<ClientType[]> {
  const auth = await requireAdmin()
  if ('error' in auth) return []
  const db = createServiceClient()
  const { data } = await (db as AnyTable)
    .from('client_types')
    .select('id, label, color, sort_order')
    .order('sort_order', { ascending: true })
  return (data ?? []) as ClientType[]
}

export async function getLeadClientTypes(leadId: string): Promise<ClientType[]> {
  const auth = await requireAdmin()
  if ('error' in auth) return []
  const db = createServiceClient()
  const { data } = await (db as AnyTable)
    .from('lead_client_types')
    .select('client_type_id, client_types(id, label, color, sort_order)')
    .eq('lead_id', leadId)
  if (!data) return []
  return (data as { client_types: ClientType }[])
    .map((r) => r.client_types)
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export async function createClientType(label: string, color: string): Promise<ClientType> {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const db = createServiceClient()
  const { data: existing } = await (db as AnyTable)
    .from('client_types')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = ((existing as { sort_order: number }[])?.[0]?.sort_order ?? -1) + 1
  const { data, error } = await (db as AnyTable)
    .from('client_types')
    .insert({ label: label.trim(), color, sort_order: nextOrder })
    .select('id, label, color, sort_order')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/admin/leads')
  return data as ClientType
}

export async function deleteClientType(id: string): Promise<void> {
  const auth = await requireAdmin()
  if ('error' in auth) return
  const db = createServiceClient()
  await (db as AnyTable).from('client_types').delete().eq('id', id)
  revalidatePath('/admin/leads')
}

export async function setLeadClientTypes(leadId: string, typeIds: string[]): Promise<void> {
  const auth = await requireAdmin()
  if ('error' in auth) return
  const db = createServiceClient()
  await (db as AnyTable).from('lead_client_types').delete().eq('lead_id', leadId)
  if (typeIds.length > 0) {
    await (db as AnyTable)
      .from('lead_client_types')
      .insert(typeIds.map((id) => ({ lead_id: leadId, client_type_id: id })))
  }
  revalidatePath('/admin/leads')
}
