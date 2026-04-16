'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

// ── Create client manually (no Auth account) ──────────────────────────────────

export async function createClient(formData: FormData): Promise<{ error?: string }> {
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
  revalidatePath('/admin/clients')
  return {}
}

// ── Invite client via Supabase Auth email ────────────────────────────────────

export async function inviteClientByEmail(email: string): Promise<{ error?: string }> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return { error: 'El email es obligatorio.' }

  const db = createServiceClient()
  const { error } = await db.auth.admin.inviteUserByEmail(trimmed, {
    data: { role: 'client' },
    redirectTo: process.env.NEXT_PUBLIC_SITE_URL + '/auth/callback',
  })
  if (error) return { error: error.message }
  return {}
}

// ── Link client to Supabase Auth user by email ────────────────────────────────

export async function linkClientToUser(
  clientId: string,
  email: string,
): Promise<{ error?: string }> {
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

  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${clientId}`)
  return {}
}

// ── Unlink client from Supabase Auth user ─────────────────────────────────────

export async function unlinkClientFromUser(
  clientId: string,
): Promise<{ error?: string }> {
  const db = createServiceClient()

  const { error } = await db
    .from('clients')
    .update({ profile_id: null })
    .eq('id', clientId)

  if (error) return { error: error.message }

  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${clientId}`)
  return {}
}

export async function updateClient(id: string, formData: FormData): Promise<{ error?: string }> {
  const db = createServiceClient()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'El nombre es obligatorio.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('clients').update({
    name,
    email: String(formData.get('email') ?? '').trim() || null,
    company: String(formData.get('company') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${id}`)
  return {}
}

export async function deleteClient(id: string): Promise<{ error?: string }> {
  const db = createServiceClient()
  const { error } = await db.from('clients').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/clients')
  return {}
}
