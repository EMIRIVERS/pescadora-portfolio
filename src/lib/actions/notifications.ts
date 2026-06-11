'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient, requireAdmin } from '@/lib/supabase/server'

export async function getNotifications(limit = 30) {
  const auth = await requireAdmin()
  if ('error' in auth) return []
  const db = createServiceClient()
  const { data, error } = await db
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data ?? []
}

export async function markAsRead(id: string): Promise<void> {
  const auth = await requireAdmin()
  if ('error' in auth) return
  const db = createServiceClient()
  const { error } = await db.from('notifications').update({ is_read: true }).eq('id', id)
  if (error) {
    console.error(`[notifications] markAsRead failed (id: ${id}):`, error.message)
    return
  }
  revalidatePath('/admin')
}

export async function markAllAsRead(): Promise<void> {
  const auth = await requireAdmin()
  if ('error' in auth) return
  const db = createServiceClient()
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)
  if (error) {
    console.error('[notifications] markAllAsRead failed:', error.message)
    return
  }
  revalidatePath('/admin')
}

export async function createNotification(
  title: string,
  body?: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  entity_type?: string,
  entity_id?: string,
): Promise<void> {
  const auth = await requireAdmin()
  if ('error' in auth) return
  const db = createServiceClient()
  const { error } = await db
    .from('notifications')
    .insert({ title, body, type, entity_type, entity_id })
  if (error) {
    console.error(`[notifications] createNotification failed ("${title}"):`, error.message)
  }
}
