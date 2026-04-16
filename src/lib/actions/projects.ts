'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import type { ProjectStatus } from '@/lib/supabase/types'
import { sendEmail } from '@/lib/email'
import { projectStatusUpdateTemplate } from '@/lib/email/templates'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pre_production:  'Pre-produccion',
  production:      'Produccion',
  post_production: 'Post-produccion',
  delivered:       'Entregado',
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
): Promise<{ error?: string }> {
  const db = createServiceClient()

  const { error } = await db.from('projects').update({ status }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${id}`)

  // Send email notification to the client — fails silently if no API key or no email
  try {
    const { data: project } = await db
      .from('projects')
      .select('title, client:clients(name, email)')
      .eq('id', id)
      .single()

    type ClientRow = { name: string; email: string | null }
    const client = project?.client as ClientRow | null

    if (client?.email) {
      const html = projectStatusUpdateTemplate(
        client.name,
        project?.title ?? '',
        status,
      )
      await sendEmail({
        to: client.email,
        subject: `Tu proyecto "${project?.title ?? ''}" ha cambiado de estado a "${STATUS_LABELS[status]}"`,
        html,
      })
    }
  } catch (emailErr) {
    console.error('[updateProjectStatus] Email notification failed:', emailErr)
  }

  return {}
}
