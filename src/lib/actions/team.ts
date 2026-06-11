'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient, requireRole } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import type { StaffRole } from '@/lib/supabase/types'
import { STAFF_ROLES } from '@/lib/auth/permissions'

/** Cuenta cuántos owners activos hay (para no dejar el sistema sin owner). */
async function ownerCount(): Promise<number> {
  const db = createServiceClient()
  const { count } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('staff_role', 'owner')
  return count ?? 0
}

/** Asigna el rol RBAC (staff_role) de un miembro. Solo un owner puede. */
export async function setStaffRole(
  profileId: string,
  role: StaffRole,
): Promise<{ error?: string }> {
  const auth = await requireRole('team', 'special')
  if ('error' in auth) return { error: auth.error }
  if (!STAFF_ROLES.includes(role)) return { error: 'Rol inválido.' }

  const db = createServiceClient()
  // Si se está degradando a un owner, asegurar que quede al menos uno.
  if (role !== 'owner') {
    const { data: target } = await db
      .from('profiles')
      .select('staff_role')
      .eq('id', profileId)
      .single()
    if (target?.staff_role === 'owner' && (await ownerCount()) <= 1) {
      return { error: 'Debe quedar al menos un miembro con rol Dirección (owner).' }
    }
  }

  const { error } = await db
    .from('profiles')
    .update({ staff_role: role, is_admin_team: true })
    .eq('id', profileId)
  if (error) return { error: error.message }
  await logAudit({
    action: 'team.set_role',
    actorId: auth.userId,
    entityType: 'team',
    entityId: profileId,
    summary: `Rol de equipo asignado: ${role}`,
  })
  revalidatePath('/admin/team')
  return {}
}

export async function updateMemberRole(
  profileId: string,
  role: string,
): Promise<{ error?: string }> {
  const auth = await requireRole('team', 'special')
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { error } = await db
    .from('profiles')
    .update({ role: role as 'admin_staff' | 'client' })
    .eq('id', profileId)
  if (error) return { error: error.message }
  await logAudit({
    action: 'team.set_role',
    actorId: auth.userId,
    entityType: 'team',
    entityId: profileId,
    summary: `Rol de miembro actualizado: ${role}`,
  })
  revalidatePath('/admin/team')
  return {}
}

export async function toggleAdminStatus(
  profileId: string,
  isAdmin: boolean,
): Promise<{ error?: string }> {
  const auth = await requireRole('team', 'special')
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()

  // No permitir quitar el acceso de staff al último owner.
  if (!isAdmin) {
    const { data: target } = await db
      .from('profiles')
      .select('staff_role')
      .eq('id', profileId)
      .single()
    if (target?.staff_role === 'owner' && (await ownerCount()) <= 1) {
      return { error: 'No puedes remover al último owner del equipo.' }
    }
  }

  const { error } = await db
    .from('profiles')
    .update({ is_admin_team: isAdmin, ...(isAdmin ? {} : { staff_role: null }) })
    .eq('id', profileId)
  if (error) return { error: error.message }
  await logAudit({
    action: 'team.toggle_admin',
    actorId: auth.userId,
    entityType: 'team',
    entityId: profileId,
    summary: isAdmin ? 'Acceso de staff otorgado' : 'Acceso de staff revocado',
  })
  revalidatePath('/admin/team')
  return {}
}
