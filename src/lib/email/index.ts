export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'XICO Films <noreply@xicofilms.com>'
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'hola@xicofilms.com'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping send')
    return
  }
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
  } catch (err) {
    console.error('[email] Failed to send to', options.to, ':', err)
  }
}
