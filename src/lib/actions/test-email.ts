'use server'
import { requireAdmin } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function sendTestEmail(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const to = String(formData.get('to') ?? '').trim()
  if (!to) return { error: 'Email requerido' }

  try {
    await sendEmail({
      to,
      subject: 'Email de prueba — XICO Films Dashboard',
      html: `<div style="background:#0a0a0a;color:#F5F5F7;padding:32px;font-family:system-ui;border-radius:8px"><h2 style="color:#0071E3">¡Funciona!</h2><p>Este es un email de prueba enviado desde el dashboard de XICO Films.</p><p style="color:#86868B;font-size:12px">Enviado el ${new Date().toLocaleString('es-MX')}</p></div>`,
    })
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
