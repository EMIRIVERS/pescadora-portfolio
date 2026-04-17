import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

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
