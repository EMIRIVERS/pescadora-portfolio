'use server'

import { createServiceClient, requireAdmin } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export interface ClientType {
  id: string
  label: string
  color: string
  sort_order: number
}

export async function getAllClientTypes(): Promise<ClientType[]> {
  const auth = await requireAdmin()
  if ('error' in auth) return []
  const db = createServiceClient()
  const { data } = await db
    .from('client_types')
    .select('id, label, color, sort_order')
    .order('sort_order', { ascending: true })
  return data ?? []
}

export async function getLeadClientTypes(leadId: string): Promise<ClientType[]> {
  const auth = await requireAdmin()
  if ('error' in auth) return []
  const db = createServiceClient()
  const { data } = await db
    .from('lead_client_types')
    .select('client_type_id, client_types(id, label, color, sort_order)')
    .eq('lead_id', leadId)
  if (!data) return []
  return data
    .map((r) => r.client_types)
    .filter((t): t is ClientType => Boolean(t))
    .sort((a, b) => a.sort_order - b.sort_order)
}

export async function createClientType(label: string, color: string): Promise<ClientType> {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const db = createServiceClient()
  const { data: existing } = await db
    .from('client_types')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1
  const { data, error } = await db
    .from('client_types')
    .insert({ label: label.trim(), color, sort_order: nextOrder })
    .select('id, label, color, sort_order')
    .single()
  if (error) throw new Error(error.message)
  await logAudit({
    action: 'client_type.create',
    actorId: auth.userId,
    entityType: 'client_type',
    entityId: data?.id ?? null,
    summary: `Tipo de cliente creado: ${label.trim()}`,
  })
  revalidatePath('/admin/leads')
  return data
}

export async function deleteClientType(id: string): Promise<void> {
  const auth = await requireAdmin()
  if ('error' in auth) return
  const db = createServiceClient()
  const { error } = await db.from('client_types').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await logAudit({
    action: 'client_type.delete',
    actorId: auth.userId,
    entityType: 'client_type',
    entityId: id,
    summary: 'Tipo de cliente eliminado',
  })
  revalidatePath('/admin/leads')
}

export async function setLeadClientTypes(leadId: string, typeIds: string[]): Promise<void> {
  const auth = await requireAdmin()
  if ('error' in auth) return
  const db = createServiceClient()
  const { error: deleteError } = await db
    .from('lead_client_types')
    .delete()
    .eq('lead_id', leadId)
  if (deleteError) throw new Error(deleteError.message)
  if (typeIds.length > 0) {
    const { error: insertError } = await db
      .from('lead_client_types')
      .insert(typeIds.map((id) => ({ lead_id: leadId, client_type_id: id })))
    if (insertError) throw new Error(insertError.message)
  }
  await logAudit({
    action: 'client_type.set_lead',
    actorId: auth.userId,
    entityType: 'lead',
    entityId: leadId,
    summary: 'Tipos de cliente del lead actualizados',
    metadata: { typeIds },
  })
  revalidatePath('/admin/leads')
}
