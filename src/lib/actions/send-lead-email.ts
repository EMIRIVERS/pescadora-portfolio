'use server'
import { sendEmail } from '@/lib/email'
import { createServiceClient, requireAdmin, escapeHtml } from '@/lib/supabase/server'

export async function sendLeadEmail(
  leadId: string,
  subject: string,
  body: string
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { data: lead } = await db
    .from('leads')
    .select('name, email')
    .eq('id', leadId)
    .single()

  if (!lead?.email) return { error: 'El lead no tiene email registrado.' }

  const html = `
    <!DOCTYPE html><html><body style="background:#0a0a0a;color:#F5F5F7;font-family:system-ui,sans-serif;padding:40px;max-width:600px;margin:0 auto;">
    <p style="font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(body).replace(/\n/g, '<br>')}</p>
    <hr style="border:none;border-top:1px solid #222;margin:32px 0;">
    <p style="font-size:12px;color:#86868B;">XICO Films</p>
    </body></html>
  `

  await sendEmail({ to: lead.email, subject, html })

  // Log activity
  await db.from('lead_activities').insert({
    lead_id: leadId,
    type: 'email',
    content: `Email enviado: "${subject}"`,
  })

  return {}
}
