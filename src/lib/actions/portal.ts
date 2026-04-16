'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolves the authenticated user's client_id, or throws if not found. */
async function resolveClientId(): Promise<string> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (error || !client) throw new Error('Cuenta de cliente no encontrada')

  return client.id
}

/** Verifies the deliverable belongs to the authenticated client's projects. */
async function verifyDeliverableOwnership(
  deliverableId: string,
  clientId: string,
): Promise<void> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_deliverables')
    .select('id, projects!inner(client_id)')
    .eq('id', deliverableId)
    .single()

  if (error || !data) throw new Error('Entregable no encontrado')

  type ProjectInner = { client_id: string | null }
  const project = data.projects as unknown as ProjectInner

  if (project.client_id !== clientId) {
    throw new Error('No tienes permiso para modificar este entregable')
  }
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

export async function approveDeliverable(
  deliverableId: string,
  feedback?: string,
): Promise<{ error?: string }> {
  try {
    const clientId = await resolveClientId()
    await verifyDeliverableOwnership(deliverableId, clientId)

    const db = createServiceClient()

    const { error } = await db
      .from('project_deliverables')
      .update({
        status: 'approved',
        client_approved_at: new Date().toISOString(),
        client_rejected_at: null,
        client_feedback: feedback ?? null,
      })
      .eq('id', deliverableId)

    if (error) return { error: error.message }

    revalidatePath('/portal/deliverables')
    revalidatePath('/portal/projects/[id]', 'page')

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function rejectDeliverable(
  deliverableId: string,
  feedback: string,
): Promise<{ error?: string }> {
  if (!feedback.trim()) {
    return { error: 'El comentario es obligatorio para solicitar cambios' }
  }

  try {
    const clientId = await resolveClientId()
    await verifyDeliverableOwnership(deliverableId, clientId)

    const db = createServiceClient()

    const { error } = await db
      .from('project_deliverables')
      .update({
        status: 'review',
        client_rejected_at: new Date().toISOString(),
        client_approved_at: null,
        client_feedback: feedback.trim(),
      })
      .eq('id', deliverableId)

    if (error) return { error: error.message }

    revalidatePath('/portal/deliverables')
    revalidatePath('/portal/projects/[id]', 'page')

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
