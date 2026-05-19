'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export async function getNotifications(limit = 30) {
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data ?? []
}

export async function markAsRead(id: string): Promise<void> {
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from('notifications').update({ is_read: true }).eq('id', id)
  revalidatePath('/admin')
}

export async function markAllAsRead(): Promise<void> {
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from('notifications').update({ is_read: true }).eq('is_read', false)
  revalidatePath('/admin')
}

export async function createNotification(
  title: string,
  body?: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  entity_type?: string,
  entity_id?: string,
): Promise<void> {
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from('notifications').insert({ title, body, type, entity_type, entity_id })
}
