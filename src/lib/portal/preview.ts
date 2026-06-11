import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

export interface PortalContext {
  /** ID del cliente cuyos datos se muestran (puede no ser el usuario actual si es preview admin). */
  clientId: string
  clientName: string | null
  /** True cuando un admin está viendo el portal de otro cliente vía ?as_client=<id>. */
  isAdminPreview: boolean
  supabase: SupabaseClient<Database>
}

/**
 * Resuelve el cliente cuyo portal se debe renderizar.
 *
 * Flujo normal: busca el cliente vinculado al `auth.uid()` del usuario logueado.
 *
 * Flujo preview admin: si llega `?as_client=<uuid>` y el usuario tiene
 * `is_admin_team=true`, devuelve ese cliente en su lugar. Las mutaciones
 * (server actions de portal) NO usan este helper — siguen atadas a la sesión,
 * por lo que un admin viendo el portal no puede aprobar/comentar como cliente.
 */
export async function resolvePortalClient(
  searchParams?: Record<string, string | string[] | undefined>
): Promise<PortalContext | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const asClientRaw = searchParams?.as_client
  const asClientId = typeof asClientRaw === 'string' ? asClientRaw : null

  if (asClientId) {
    // Verificar que el caller es admin antes de aceptar el override.
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin_team')
      .eq('id', user.id)
      .single()

    if (profile?.is_admin_team) {
      const { data: target } = await supabase
        .from('clients')
        .select('id, name')
        .eq('id', asClientId)
        .single()

      if (target) {
        return {
          clientId: target.id,
          clientName: target.name ?? null,
          isAdminPreview: true,
          supabase,
        }
      }
    }
    // Si no es admin o el cliente no existe, caemos al flujo normal.
  }

  // Flujo normal: resolver por profile_id.
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('profile_id', user.id)
    .single()

  if (!client) return null

  return {
    clientId: client.id,
    clientName: client.name ?? null,
    isAdminPreview: false,
    supabase,
  }
}

/**
 * Para componentes de portal que necesitan pasar el `?as_client` a otras
 * rutas del portal cuando están en modo preview.
 */
export function portalLink(href: string, ctx: Pick<PortalContext, 'isAdminPreview' | 'clientId'>): string {
  if (!ctx.isAdminPreview) return href
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}as_client=${ctx.clientId}`
}
