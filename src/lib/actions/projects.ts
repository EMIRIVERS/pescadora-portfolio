'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient, requireAdmin } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
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
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()

  const { error } = await db.from('projects').update({ status }).eq('id', id)
  if (error) return { error: error.message }

  await logAudit({
    action: 'project.status',
    actorId: auth.userId,
    entityType: 'project',
    entityId: id,
    summary: `Estado de proyecto cambiado a ${STATUS_LABELS[status]}`,
  })

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

export async function saveInternalNotes(
  projectId: string,
  notes: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { error } = await db
    .from('projects')
    .update({ internal_notes: notes || null })
    .eq('id', projectId)
  if (error) return { error: error.message }
  await logAudit({
    action: 'project.update',
    actorId: auth.userId,
    entityType: 'project',
    entityId: projectId,
    summary: 'Notas internas del proyecto actualizadas',
  })
  revalidatePath(`/admin/projects/${projectId}`)
  return {}
}

export interface ProjectComment {
  id: string
  project_id: string
  author_id: string
  content: string
  created_at: string
  author?: { full_name: string | null; avatar_url: string | null } | null
}

export async function getProjectComments(
  projectId: string,
): Promise<ProjectComment[]> {
  const auth = await requireAdmin()
  if ('error' in auth) return []
  const db = createServiceClient()
  const { data } = await db
    .from('project_comments')
    .select('*, author:profiles(full_name, avatar_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  return (data ?? []) as ProjectComment[]
}

export async function createProjectComment(
  projectId: string,
  content: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const db = createServiceClient()
  const { error } = await db.from('project_comments').insert({
    project_id: projectId,
    author_id: auth.userId,
    content: content.trim(),
  })
  if (error) return { error: error.message }
  await logAudit({
    action: 'project.comment_create',
    actorId: auth.userId,
    entityType: 'project',
    entityId: projectId,
    summary: 'Comentario agregado al proyecto',
  })
  revalidatePath(`/admin/projects/${projectId}`)
  return {}
}

export async function deleteProjectComment(
  commentId: string,
  projectId: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { error } = await db
    .from('project_comments')
    .delete()
    .eq('id', commentId)
  if (error) return { error: error.message }
  await logAudit({
    action: 'project.comment_delete',
    actorId: auth.userId,
    entityType: 'project',
    entityId: projectId,
    summary: 'Comentario eliminado del proyecto',
    metadata: { commentId },
  })
  revalidatePath(`/admin/projects/${projectId}`)
  return {}
}
