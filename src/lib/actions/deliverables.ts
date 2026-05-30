'use server'

// ---------------------------------------------------------------------------
// SQL — run once in Supabase SQL editor to create the revisions table
// ---------------------------------------------------------------------------
// create table public.deliverable_revisions (
//   id              uuid primary key default gen_random_uuid(),
//   deliverable_id  uuid not null references public.project_deliverables(id) on delete cascade,
//   revision_number integer not null,
//   url             text,
//   notes           text,
//   created_at      timestamptz not null default now()
// );
// create index on public.deliverable_revisions (deliverable_id, revision_number);
// ---------------------------------------------------------------------------

import { revalidatePath } from 'next/cache'
import { createServiceClient, requireAdmin, escapeHtml } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import type { Deliverable, DeliverableRevision, DeliverableType, DeliverableStatus } from '@/lib/supabase/types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xicofilms.com'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateDeliverableInput {
  projectId: string
  title: string
  description: string | null
  url: string | null
  type: DeliverableType
  status: DeliverableStatus
}

export interface CreateDeliverableResult {
  data?: Deliverable
  error?: string
}

// ---------------------------------------------------------------------------
// Email template — new deliverable notification
// ---------------------------------------------------------------------------

function newDeliverableTemplate(
  clientName: string,
  deliverableTitle: string,
  projectTitle: string,
  portalUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nuevo entregable disponible</title>
</head>
<body style="margin:0;padding:0;background-color:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#050505;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#111111;border:1px solid #222222;border-bottom:1px solid #1a1a1a;border-radius:12px 12px 0 0;padding:32px 40px 24px;text-align:center;">
              <span style="font-size:22px;font-weight:700;letter-spacing:0.2em;color:#ffffff;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">XICO FILMS</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#111111;border:1px solid #222222;border-top:none;border-radius:0 0 12px 12px;padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:11px;font-weight:600;letter-spacing:0.15em;color:#555555;text-transform:uppercase;">Nuevo entregable disponible</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#cccccc;">Hola <strong style="color:#ffffff;">${escapeHtml(clientName)}</strong>,</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#cccccc;">Hay un nuevo entregable listo para revisar en tu proyecto <strong style="color:#ffffff;">${escapeHtml(projectTitle)}</strong>.</p>
              <div style="background-color:#0a0a0a;border:1px solid #222222;border-left:3px solid #0071E3;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#cccccc;"><strong style="color:#ffffff;">${escapeHtml(deliverableTitle)}</strong></p>
              </div>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#cccccc;">Ingresa a tu portal para revisar, aprobar o solicitar cambios.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="border-radius:8px;background-color:#0071E3;">
                    <a href="${portalUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Ver mi portal</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="height:1px;background-color:#222222;margin:24px 0;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#cccccc;">El equipo de <strong style="color:#ffffff;">XICO Films</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555555;letter-spacing:0.05em;">
                XICO Films &middot; <a href="${SITE_URL}" style="color:#555555;text-decoration:none;">xicofilms.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

export async function createDeliverable(
  input: CreateDeliverableInput,
): Promise<CreateDeliverableResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()

  // 1. Insert the deliverable
  const { data: deliverable, error: insertError } = await db
    .from('project_deliverables')
    .insert({
      project_id: input.projectId,
      title: input.title,
      description: input.description,
      url: input.url,
      type: input.type,
      status: input.status,
    })
    .select('*')
    .single()

  if (insertError || !deliverable) {
    return { error: insertError?.message ?? 'No se pudo agregar el entregable.' }
  }

  revalidatePath(`/admin/projects/${input.projectId}`)

  // 2. Send email notification to the client — fire-and-forget
  try {
    const { data: projectRow } = await db
      .from('projects')
      .select('title, client:clients(name, email)')
      .eq('id', input.projectId)
      .single()

    type ClientRow = { name: string; email: string | null }
    const projectClient = projectRow?.client as ClientRow | null

    if (projectClient?.email) {
      const portalUrl = `${SITE_URL}/portal`
      const html = newDeliverableTemplate(
        projectClient.name,
        input.title,
        projectRow?.title ?? '',
        portalUrl,
      )
      await sendEmail({
        to: projectClient.email,
        subject: `Nuevo entregable disponible: "${input.title}" — ${projectRow?.title ?? ''}`,
        html,
      })
    }
  } catch (emailErr) {
    console.error('[createDeliverable] Email notification failed:', emailErr)
  }

  return { data: deliverable as Deliverable }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export interface UpdateDeliverableInput {
  id: string
  projectId: string
  title: string
  description: string | null
  url: string | null
  type: DeliverableType
  status: DeliverableStatus
  due_date: string | null
}

export async function updateDeliverable(
  input: UpdateDeliverableInput,
): Promise<{ error?: string; data?: Deliverable }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()

  if (!input.title.trim()) {
    return { error: 'El titulo es obligatorio.' }
  }

  const { data, error } = await db
    .from('project_deliverables')
    .update({
      title: input.title.trim(),
      description: input.description ?? null,
      url: input.url ?? null,
      type: input.type,
      status: input.status,
      due_date: input.due_date ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/admin/projects/${input.projectId}`)
  return { data: data as Deliverable }
}

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

/**
 * Fetch all revisions for a deliverable, ordered oldest → newest.
 */
export async function getRevisions(deliverableId: string): Promise<DeliverableRevision[]> {
  const auth = await requireAdmin()
  if ('error' in auth) return []
  const db = createServiceClient()

  const { data, error } = await db
    .from('deliverable_revisions')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .order('revision_number', { ascending: true })

  if (error) {
    console.error('[getRevisions]', error.message)
    return []
  }

  return (data ?? []) as DeliverableRevision[]
}

/**
 * Insert a new revision, bump the revision_number automatically, and update
 * the parent deliverable's url so the portal always shows the latest link.
 */
export async function addRevision(
  deliverableId: string,
  input: { url: string | null; notes: string | null },
): Promise<{ error?: string; data?: DeliverableRevision }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()

  // Count existing revisions to derive the next revision_number
  const { count, error: countError } = await db
    .from('deliverable_revisions')
    .select('id', { count: 'exact', head: true })
    .eq('deliverable_id', deliverableId)

  if (countError) return { error: countError.message }

  const revisionNumber = (count ?? 0) + 1

  const { data: revision, error: insertError } = await db
    .from('deliverable_revisions')
    .insert({
      deliverable_id: deliverableId,
      revision_number: revisionNumber,
      url: input.url,
      notes: input.notes,
    })
    .select('*')
    .single()

  if (insertError || !revision) {
    return { error: insertError?.message ?? 'No se pudo agregar la revision.' }
  }

  // Update the parent deliverable url to always point to the latest revision
  if (input.url) {
    const { error: updateError } = await db
      .from('project_deliverables')
      .update({ url: input.url, updated_at: new Date().toISOString() })
      .eq('id', deliverableId)

    if (updateError) {
      console.error('[addRevision] Failed to update parent deliverable url:', updateError.message)
    }
  }

  // Fetch the project_id for cache invalidation
  const { data: deliverableRow } = await db
    .from('project_deliverables')
    .select('project_id')
    .eq('id', deliverableId)
    .single()

  if (deliverableRow?.project_id) {
    revalidatePath(`/admin/projects/${deliverableRow.project_id}`)
    revalidatePath(`/portal/projects/${deliverableRow.project_id}`)
  }

  return { data: revision as DeliverableRevision }
}
