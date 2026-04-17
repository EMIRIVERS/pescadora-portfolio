import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@pescadora.studio'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  const { error } = await resend.emails.send({
    from: from ?? `Pescadora Studio <${process.env.RESEND_FROM_EMAIL ?? 'noreply@pescadora.studio'}>`,
    to,
    subject,
    html,
  })
  if (error) throw new Error(error.message)
}
