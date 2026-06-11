import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database, StaffRole } from '@/lib/supabase/types'
import { can, type Resource, type Action } from '@/lib/auth/permissions'

/**
 * Verifies the current request comes from an authenticated admin team member.
 * Use at the top of every admin server action.
 *
 * Returns `{ userId }` on success, or `{ error }` if unauthenticated / unauthorized.
 */
export async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado.' }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('is_admin_team')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin_team) return { error: 'No autorizado.' }
  return { userId: user.id }
}

/**
 * Verifica que el usuario sea staff Y que su rol (`staff_role`) tenga permiso
 * para `action` sobre `resource`, según la matriz en `@/lib/auth/permissions`.
 * Úsalo en server actions cuyo recurso restringe a algún rol. Para acciones que
 * cualquier staff puede ejecutar, sigue valiendo `requireAdmin()`.
 */
export async function requireRole(
  resource: Resource,
  action: Action,
): Promise<{ userId: string; role: StaffRole } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado.' }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('is_admin_team, staff_role')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin_team) return { error: 'No autorizado.' }
  const role = (profile.staff_role ?? null) as StaffRole | null
  if (!can(role, resource, action)) return { error: 'Permiso insuficiente para esta acción.' }
  return { userId: user.id, role: role as StaffRole }
}

/**
 * Escapes special HTML characters to prevent XSS in email templates.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Creates a Supabase service-role client that bypasses RLS.
 * Only use in trusted server-side contexts (admin pages, server actions).
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/**
 * Anon, cookie-free Supabase client for PUBLIC reads (RLS-enforced with the
 * anon key). Because it never touches cookies, pages using it stay statically
 * cacheable (ISR) instead of opting into dynamic rendering. Use only for
 * public, RLS-readable data (e.g. the marketing home).
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

/**
 * Creates a Supabase client for use in Server Components and Route Handlers.
 * Reads cookies from the Next.js `cookies()` store (read-only in Server Components,
 * read-write in Route Handlers / Server Actions).
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll is called from a Server Component where cookies are read-only.
            // This is safe to ignore — the middleware handles session refresh.
          }
        },
      },
    }
  )
}
