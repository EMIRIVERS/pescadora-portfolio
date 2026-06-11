import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient, escapeHtml } from '@/lib/supabase/server'
import { sendEmail, ADMIN_EMAIL } from '@/lib/email'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface NotifyParams {
  title: string
  body?: string | null
  type?: NotificationType
  entityType?: string | null
  entityId?: string | null
  /** Además del aviso in-app, enviar email al equipo (ADMIN_EMAIL). */
  email?: boolean
}

/**
 * Crea un aviso in-app para el equipo (tabla `notifications`) y, opcionalmente,
 * envía un email al admin. Server-only, usa service-role: funciona sin contexto
 * de auth (eventos disparados por clientes o flujos públicos). Nunca lanza: una
 * notificación fallida no debe romper el flujo principal.
 */
export async function notify(params: NotifyParams): Promise<void> {
  try {
    const db = createServiceClient() as unknown as SupabaseClient
    await db.from('notifications').insert({
      title: params.title,
      body: params.body ?? null,
      type: params.type ?? 'info',
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
    })
  } catch (err) {
    console.error('[notify] failed to write notification:', err)
  }

  if (params.email) {
    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: params.title,
        html: `<p>${escapeHtml(params.body ?? params.title)}</p>`,
      })
    } catch (err) {
      console.error('[notify] failed to send email:', err)
    }
  }
}
