'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import type { ProjectStatus } from '@/lib/supabase/types'

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
): Promise<{ error?: string }> {
  const db = createServiceClient()
  const { error } = await db.from('projects').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${id}`)
  return {}
}
