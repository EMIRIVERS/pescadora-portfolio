'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient, requireAdmin } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import type { Lead, LeadStatus, LeadSource, LeadActivityType } from '@/lib/supabase/types'
import { sendEmail, ADMIN_EMAIL } from '@/lib/email'
import {
  leadWelcomeTemplate,
  leadAdminNotifyTemplate,
  leadStatusUpdateTemplate,
  projectStartedTemplate,
} from '@/lib/email/templates'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the authenticated user's id, or null if unauthenticated. */
async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

function revalidateLeads() {
  revalidatePath('/admin/leads')
  revalidatePath('/admin')
}

// ---------------------------------------------------------------------------
// createLead
// ---------------------------------------------------------------------------

export async function createLead(
  formData: FormData
): Promise<{ lead?: Lead; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const userId = await getCurrentUserId()
  const db = createServiceClient()

  const name = formData.get('name')
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { error: 'Name is required.' }
  }

  const raw = {
    name: name.trim(),
    email: (formData.get('email') as string | null) || null,
    phone: (formData.get('phone') as string | null) || null,
    company: (formData.get('company') as string | null) || null,
    status: ((formData.get('status') as string | null) ?? 'new') as LeadStatus,
    source: ((formData.get('source') as string | null) ?? 'manual') as LeadSource,
    notes: (formData.get('notes') as string | null) || null,
    budget_range: (formData.get('budget_range') as string | null) || null,
    project_type: (formData.get('project_type') as string | null) || null,
    assigned_to: (formData.get('assigned_to') as string | null) || null,
    last_contacted_at: (formData.get('last_contacted_at') as string | null) || null,
    expected_close_date: (formData.get('expected_close_date') as string | null) || null,
  }

  const { data: lead, error } = await db
    .from('leads')
    .insert(raw)
    .select()
    .single()

  if (error || !lead) {
    return { error: error?.message ?? 'Failed to create lead.' }
  }

  // Log initial status_change activity (secondary: no rompe la creación del lead)
  const { error: activityError } = await db.from('lead_activities').insert({
    lead_id: lead.id,
    user_id: userId,
    type: 'status_change' as LeadActivityType,
    content: 'Lead created.',
    old_status: null,
    new_status: lead.status,
  })
  if (activityError) {
    console.error(`[createLead] Failed to log lead activity (lead: ${lead.id}):`, activityError.message)
  }

  // Send emails — fire-and-forget, errors are swallowed inside sendEmail
  const emailTasks: Promise<void>[] = [
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Nuevo lead: ${lead.name}`,
      html: leadAdminNotifyTemplate({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        project_type: lead.project_type,
        budget_range: lead.budget_range,
        notes: lead.notes,
        source: lead.source,
      }),
    }),
  ]
  if (lead.email) {
    emailTasks.push(
      sendEmail({
        to: lead.email,
        subject: 'Recibimos tu solicitud — XICO Films',
        html: leadWelcomeTemplate(lead.name, lead.project_type),
      })
    )
  }
  await Promise.allSettled(emailTasks)

  await logAudit({
    action: 'lead.create',
    actorId: auth.userId,
    entityType: 'lead',
    entityId: lead.id,
    summary: `Lead creado: ${lead.name}`,
  })

  revalidateLeads()
  return { lead }
}

// ---------------------------------------------------------------------------
// updateLead
// ---------------------------------------------------------------------------

export async function updateLead(
  id: string,
  formData: FormData
): Promise<{ lead?: Lead; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const userId = await getCurrentUserId()
  const db = createServiceClient()

  // Fetch current lead to detect status changes
  const { data: existing, error: fetchError } = await db
    .from('leads')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return { error: fetchError?.message ?? 'Lead not found.' }
  }

  const updates: Record<string, string | null> = {}

  const stringFields = [
    'name',
    'email',
    'phone',
    'company',
    'status',
    'source',
    'notes',
    'budget_range',
    'project_type',
    'assigned_to',
    'last_contacted_at',
    'expected_close_date',
  ] as const

  for (const field of stringFields) {
    const value = formData.get(field)
    if (value !== null) {
      updates[field] = (value as string).trim() || null
    }
  }

  // Ensure name is not blanked out
  if ('name' in updates && !updates.name) {
    return { error: 'Name is required.' }
  }

  const { data: lead, error } = await db
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !lead) {
    return { error: error?.message ?? 'Failed to update lead.' }
  }

  // Log status change if it occurred
  const newStatus = updates.status as LeadStatus | undefined
  if (newStatus && newStatus !== existing.status) {
    const { error: activityError } = await db.from('lead_activities').insert({
      lead_id: id,
      user_id: userId,
      type: 'status_change' as LeadActivityType,
      content: `Status changed from ${existing.status} to ${newStatus}.`,
      old_status: existing.status,
      new_status: newStatus,
    })
    if (activityError) {
      console.error(`[updateLead] Failed to log status change activity (lead: ${id}):`, activityError.message)
    }
  }

  await logAudit({
    action: 'lead.update',
    actorId: auth.userId,
    entityType: 'lead',
    entityId: id,
    summary: `Lead actualizado: ${lead.name}`,
  })

  revalidateLeads()
  return { lead }
}

// ---------------------------------------------------------------------------
// deleteLead
// ---------------------------------------------------------------------------

export async function deleteLead(id: string): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()

  const { error } = await db.from('leads').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  await logAudit({
    action: 'lead.delete',
    actorId: auth.userId,
    entityType: 'lead',
    entityId: id,
    summary: 'Lead eliminado',
  })

  revalidateLeads()
  return {}
}

// ---------------------------------------------------------------------------
// updateLeadStatus
// ---------------------------------------------------------------------------

export async function updateLeadStatus(
  id: string,
  status: LeadStatus
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const userId = await getCurrentUserId()
  const db = createServiceClient()

  // Fetch current status + contact info for activity log and email
  const { data: existing, error: fetchError } = await db
    .from('leads')
    .select('status, name, email')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return { error: fetchError?.message ?? 'Lead not found.' }
  }

  const { error } = await db
    .from('leads')
    .update({ status })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  const { error: activityError } = await db.from('lead_activities').insert({
    lead_id: id,
    user_id: userId,
    type: 'status_change' as LeadActivityType,
    content: `Status changed from ${existing.status} to ${status}.`,
    old_status: existing.status,
    new_status: status,
  })
  if (activityError) {
    console.error(`[updateLeadStatus] Failed to log status change activity (lead: ${id}):`, activityError.message)
  }

  // Notify lead by email when status reaches a significant milestone
  if ((status === 'qualified' || status === 'proposal') && existing.email) {
    await Promise.allSettled([
      sendEmail({
        to: existing.email,
        subject: 'Actualizacion sobre tu solicitud — XICO Films',
        html: leadStatusUpdateTemplate(existing.name, status),
      }),
    ])
  }

  await logAudit({
    action: 'lead.status',
    actorId: auth.userId,
    entityType: 'lead',
    entityId: id,
    summary: `Estado de lead cambiado a ${status}`,
  })

  revalidateLeads()
  return {}
}

// ---------------------------------------------------------------------------
// addLeadActivity
// ---------------------------------------------------------------------------

export async function addLeadActivity(
  leadId: string,
  type: LeadActivityType,
  content: string
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const userId = await getCurrentUserId()
  const db = createServiceClient()

  const { error } = await db.from('lead_activities').insert({
    lead_id: leadId,
    user_id: userId,
    type,
    content,
  })

  if (error) {
    return { error: error.message }
  }

  await logAudit({
    action: 'lead.activity',
    actorId: auth.userId,
    entityType: 'lead',
    entityId: leadId,
    summary: `Actividad registrada en lead (${type})`,
  })

  // Auto-update last_contacted_at for contact-type activities
  if (['whatsapp', 'call', 'email', 'meeting'].includes(type)) {
    await db
      .from('leads')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', leadId)
  }

  revalidateLeads()
  return {}
}

// ---------------------------------------------------------------------------
// convertLeadToClient
// ---------------------------------------------------------------------------

export async function convertLeadToClient(
  leadId: string
): Promise<{ clientId?: string; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const userId = await getCurrentUserId()
  const db = createServiceClient()

  // Fetch the lead
  const { data: lead, error: fetchError } = await db
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (fetchError || !lead) {
    return { error: fetchError?.message ?? 'Lead not found.' }
  }

  // Create a new client from lead data
  const { data: client, error: clientError } = await db
    .from('clients')
    .insert({
      name: lead.name,
      email: lead.email,
      company: lead.company,
    })
    .select()
    .single()

  if (clientError || !client) {
    return { error: clientError?.message ?? 'Failed to create client.' }
  }

  // Mark lead as won and link to the new client
  const { error: updateError } = await db
    .from('leads')
    .update({
      status: 'won' as LeadStatus,
      converted_to_client_id: client.id,
    })
    .eq('id', leadId)

  if (updateError) {
    return { error: updateError.message }
  }

  await logAudit({
    action: 'lead.convert',
    actorId: auth.userId,
    entityType: 'lead',
    entityId: leadId,
    summary: `Lead convertido a cliente: ${lead.name}`,
    metadata: { clientId: client.id },
  })

  // Log the conversion as a status_change activity
  const { error: activityError } = await db.from('lead_activities').insert({
    lead_id: leadId,
    user_id: userId,
    type: 'status_change' as LeadActivityType,
    content: `Lead converted to client (client id: ${client.id}).`,
    old_status: lead.status,
    new_status: 'won',
  })
  if (activityError) {
    console.error(`[convertLeadToClient] Failed to log conversion activity (lead: ${leadId}):`, activityError.message)
  }

  // Notify the new client that their project has started
  if (lead.email) {
    await Promise.allSettled([
      sendEmail({
        to: lead.email,
        subject: 'Tu proyecto comenzo — XICO Films',
        html: projectStartedTemplate(lead.name, 'tu proyecto'),
      }),
    ])
  }

  revalidateLeads()
  return { clientId: client.id }
}
