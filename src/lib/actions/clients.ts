'use server'
import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServiceClient, requireAdmin, escapeHtml } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { sendEmail, ADMIN_EMAIL } from '@/lib/email'

// ── Minimal DB type for email_log (not yet in generated types) ────────────────
interface EmailLogDb {
  public: {
    Tables: {
      email_log: {
        Row: { id: string; to_email: string; subject: string; template_name: string; sent_at: string }
        Insert: { to_email: string; subject: string; template_name: string }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

function createEmailLogClient() {
  return createSupabaseClient<EmailLogDb>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// ── Create client manually (no Auth account) ──────────────────────────────────

export async function createClient(formData: FormData): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const db = createServiceClient()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'El nombre es obligatorio.' }

  const { error } = await db.from('clients').insert({
    name,
    email: String(formData.get('email') ?? '').trim() || null,
    company: String(formData.get('company') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
  })

  if (error) return { error: error.message }

  // Notify admin that a new client was created — fire-and-forget
  const clientEmail = String(formData.get('email') ?? '').trim() || null
  const clientName = String(formData.get('name') ?? '').trim()
  const safeClientName = escapeHtml(clientName)
  const safeClientEmail = clientEmail ? escapeHtml(clientEmail) : null
  const notificationHtml = `<!DOCTYPE html><html><body style="background:#0a0a0a;color:#F5F5F7;font-family:system-ui,sans-serif;padding:40px;max-width:600px;margin:0 auto;">
    <h2 style="font-size:18px;font-weight:700;color:#F5F5F7;margin:0 0 16px;">Nuevo cliente creado</h2>
    <p style="font-size:14px;line-height:1.7;color:#cccccc;margin:0 0 8px;"><strong>Nombre:</strong> ${safeClientName}</p>
    ${safeClientEmail ? `<p style="font-size:14px;line-height:1.7;color:#cccccc;margin:0 0 8px;"><strong>Email:</strong> ${safeClientEmail}</p>` : ''}
    <hr style="border:none;border-top:1px solid #222;margin:24px 0;">
    <p style="font-size:12px;color:#86868B;">XICO Films — Panel de administracion</p>
    </body></html>`

  await Promise.allSettled([
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Nuevo cliente: ${clientName}`,
      html: notificationHtml,
    }),
  ])

  // Insert into email_log so the automations history panel reflects this event
  try {
    const logDb = createEmailLogClient()
    await logDb.from('email_log').insert({
      to_email: ADMIN_EMAIL,
      subject: `Nuevo cliente: ${clientName}`,
      template_name: 'new_client',
    })
  } catch {
    // email_log may not exist yet — safe to ignore
  }

  await logAudit({
    action: 'client.create',
    actorId: auth.userId,
    entityType: 'client',
    entityId: null,
    summary: `Cliente creado: ${name}`,
  })

  revalidatePath('/admin/clients')
  return {}
}

// ── Invite client via Supabase Auth email ────────────────────────────────────

export async function inviteClientByEmail(email: string): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return { error: 'El email es obligatorio.' }

  const db = createServiceClient()
  const { error } = await db.auth.admin.inviteUserByEmail(trimmed, {
    data: { role: 'client' },
    redirectTo: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xicofilms.com') + '/auth/callback',
  })
  if (error) return { error: error.message }
  return {}
}

// ── Link client to Supabase Auth user by email ────────────────────────────────

export async function linkClientToUser(
  clientId: string,
  email: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail) return { error: 'El email es obligatorio.' }

  const db = createServiceClient()

  // 1. Look up the profile with that email (profiles mirror auth.users 1:1)
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id')
    .eq('email', trimmedEmail)
    .maybeSingle()

  if (profileError) return { error: profileError.message }

  // 2. If not found in profiles, try auth.users via Admin API
  let profileId: string | null = profile?.id ?? null

  if (!profileId) {
    const { data: adminList, error: adminError } =
      await db.auth.admin.listUsers({ perPage: 1000 })

    if (adminError) return { error: adminError.message }

    const authUser = adminList.users.find(
      (u) => u.email?.toLowerCase() === trimmedEmail,
    )

    if (!authUser) {
      return {
        error: `No existe una cuenta de Supabase Auth con el email "${trimmedEmail}". Invita al cliente primero.`,
      }
    }

    profileId = authUser.id
  }

  // 3. Update the client record
  const { error: updateError } = await db
    .from('clients')
    .update({ profile_id: profileId })
    .eq('id', clientId)

  if (updateError) return { error: updateError.message }

  await logAudit({
    action: 'client.update',
    actorId: auth.userId,
    entityType: 'client',
    entityId: clientId,
    summary: 'Cliente vinculado a cuenta de usuario',
  })

  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${clientId}`)
  return {}
}

// ── Unlink client from Supabase Auth user ─────────────────────────────────────

export async function unlinkClientFromUser(
  clientId: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const db = createServiceClient()

  const { error } = await db
    .from('clients')
    .update({ profile_id: null })
    .eq('id', clientId)

  if (error) return { error: error.message }

  await logAudit({
    action: 'client.update',
    actorId: auth.userId,
    entityType: 'client',
    entityId: clientId,
    summary: 'Cliente desvinculado de cuenta de usuario',
  })

  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${clientId}`)
  return {}
}

export async function updateClient(id: string, formData: FormData): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const db = createServiceClient()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'El nombre es obligatorio.' }

  const { error } = await db.from('clients').update({
    name,
    email: String(formData.get('email') ?? '').trim() || null,
    company: String(formData.get('company') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  await logAudit({
    action: 'client.update',
    actorId: auth.userId,
    entityType: 'client',
    entityId: id,
    summary: `Cliente actualizado: ${name}`,
  })
  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${id}`)
  return {}
}

export async function deleteClient(id: string): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const db = createServiceClient()
  const { error } = await db.from('clients').delete().eq('id', id)
  if (error) return { error: error.message }
  await logAudit({
    action: 'client.delete',
    actorId: auth.userId,
    entityType: 'client',
    entityId: id,
    summary: 'Cliente eliminado',
  })
  revalidatePath('/admin/clients')
  return {}
}
