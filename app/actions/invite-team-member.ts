'use server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function removeTeamMember(profileId: string): Promise<{ error?: string }> {
  if (!profileId) return { error: 'ID de perfil requerido' }

  const db = createServiceClient()
  const { error } = await db.auth.admin.deleteUser(profileId)
  if (error) return { error: error.message }

  revalidatePath('/admin/team')
  return {}
}

export async function updateMyProfile(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'No autenticado' }

  const full_name = String(formData.get('full_name') ?? '').trim() || null
  const avatar_url = String(formData.get('avatar_url') ?? '').trim() || null

  const db = createServiceClient()
  const { error } = await db
    .from('profiles')
    .update({ full_name, avatar_url } as unknown as Record<string, unknown>)
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/admin/team')
  return {}
}

export async function inviteTeamMember(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const role = String(formData.get('role') ?? 'Asistente').trim()

  if (!email) return { error: 'Email es obligatorio' }

  const db = createServiceClient()

  // Usa la Admin API de Supabase para invitar al usuario
  // La invitación crea el usuario y le envía un email
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    data: { role, is_admin_team: true },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  })

  if (error) return { error: error.message }

  // Si se creó el usuario, actualizar su perfil con el rol
  if (data?.user?.id) {
    await db.from('profiles').upsert(
      {
        id: data.user.id,
        email,
        role: role as 'admin_staff',
        is_admin_team: true,
      },
      { onConflict: 'id' },
    )
  }

  revalidatePath('/admin/team')
  return {}
}

// ── Add team member manually (creates Auth user, no invitation email) ─────────

export async function addTeamMemberManually(
  name: string,
  email: string,
  role: string,
): Promise<{ error?: string }> {
  const trimmedName = name.trim()
  const trimmedEmail = email.trim().toLowerCase()
  const trimmedRole = role.trim() || 'Asistente'

  if (!trimmedName) return { error: 'El nombre es obligatorio.' }
  if (!trimmedEmail) return { error: 'El email es obligatorio.' }

  const db = createServiceClient()

  // Generate a random password — user will need to reset it
  const randomPassword =
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2).toUpperCase() +
    '!'

  const { data, error: createError } = await db.auth.admin.createUser({
    email: trimmedEmail,
    password: randomPassword,
    email_confirm: true,
    user_metadata: { full_name: trimmedName, role: trimmedRole, is_admin_team: true },
  })

  if (createError) return { error: createError.message }

  if (data?.user?.id) {
    await db.from('profiles').upsert(
      {
        id: data.user.id,
        email: trimmedEmail,
        full_name: trimmedName,
        role: trimmedRole as 'admin_staff',
        is_admin_team: true,
      },
      { onConflict: 'id' },
    )
  }

  revalidatePath('/admin/team')
  return {}
}
