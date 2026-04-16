'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export async function updateMemberRole(
  profileId: string,
  role: string,
): Promise<{ error?: string }> {
  const db = createServiceClient()
  const { error } = await db
    .from('profiles')
    .update({ role: role as 'admin_staff' | 'client' })
    .eq('id', profileId)
  if (error) return { error: error.message }
  revalidatePath('/admin/team')
  return {}
}

export async function toggleAdminStatus(
  profileId: string,
  isAdmin: boolean,
): Promise<{ error?: string }> {
  const db = createServiceClient()
  const { error } = await db
    .from('profiles')
    .update({ is_admin_team: isAdmin })
    .eq('id', profileId)
  if (error) return { error: error.message }
  revalidatePath('/admin/team')
  return {}
}
