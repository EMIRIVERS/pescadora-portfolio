'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient, requireAdmin } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventStatus,
} from '@/lib/calendar/types'

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const db = createServiceClient()
  const { data, error } = await db
    .from('calendar_events')
    .select('*, projects(title), clients(name)')
    .order('event_date', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as CalendarEvent[]
}

// ─── Create / Update ──────────────────────────────────────────────────────────

/** Si no se pasó client_id pero sí project_id, lo deriva del proyecto. */
async function resolveClientId(
  db: ReturnType<typeof createServiceClient>,
  data: CalendarEventInput,
): Promise<string | null> {
  if (data.client_id) return data.client_id
  if (!data.project_id) return null
  const { data: project } = await db
    .from('projects')
    .select('client_id')
    .eq('id', data.project_id)
    .single()
  return project?.client_id ?? null
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createCalendarEvent(data: CalendarEventInput): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  if (!data.title.trim()) return { error: 'El título es obligatorio.' }
  if (!data.event_date) return { error: 'La fecha es obligatoria.' }

  const db = createServiceClient()
  const client_id = await resolveClientId(db, data)

  const { error } = await db.from('calendar_events').insert({
    title: data.title.trim(),
    type: data.type,
    event_date: data.event_date,
    event_time: data.event_time || null,
    project_id: data.project_id || null,
    client_id,
    invoice_id: data.invoice_id || null,
    notes: data.notes.trim() || null,
    status: data.status || 'pendiente',
    created_by: auth.userId,
  })
  if (error) return { error: error.message }
  await logAudit({
    action: 'calendar.create',
    actorId: auth.userId,
    entityType: 'calendar',
    entityId: null,
    summary: `Evento de calendario creado: ${data.title.trim()}`,
  })
  revalidatePath('/admin/calendar')
  return {}
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateCalendarEvent(
  id: string,
  data: CalendarEventInput,
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  if (!data.title.trim()) return { error: 'El título es obligatorio.' }
  if (!data.event_date) return { error: 'La fecha es obligatoria.' }

  const db = createServiceClient()
  const client_id = await resolveClientId(db, data)

  const { error } = await db
    .from('calendar_events')
    .update({
      title: data.title.trim(),
      type: data.type,
      event_date: data.event_date,
      event_time: data.event_time || null,
      project_id: data.project_id || null,
      client_id,
      invoice_id: data.invoice_id || null,
      notes: data.notes.trim() || null,
      status: data.status,
    })
    .eq('id', id)
  if (error) return { error: error.message }
  await logAudit({
    action: 'calendar.update',
    actorId: auth.userId,
    entityType: 'calendar',
    entityId: id,
    summary: `Evento de calendario actualizado: ${data.title.trim()}`,
  })
  revalidatePath('/admin/calendar')
  return {}
}

// ─── Status toggle ────────────────────────────────────────────────────────────

export async function setCalendarEventStatus(
  id: string,
  status: CalendarEventStatus,
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { error } = await db.from('calendar_events').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  await logAudit({
    action: 'calendar.status',
    actorId: auth.userId,
    entityType: 'calendar',
    entityId: id,
    summary: `Estado de evento cambiado a ${status}`,
  })
  revalidatePath('/admin/calendar')
  return {}
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteCalendarEvent(id: string): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { error } = await db.from('calendar_events').delete().eq('id', id)
  if (error) return { error: error.message }
  await logAudit({
    action: 'calendar.delete',
    actorId: auth.userId,
    entityType: 'calendar',
    entityId: id,
    summary: 'Evento de calendario eliminado',
  })
  revalidatePath('/admin/calendar')
  return {}
}
