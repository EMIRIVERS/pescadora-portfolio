import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import PortalLogoutButton from '@/components/portal/logout-button'
import PortalTabBar from '@/components/portal/PortalTabBar'
import '../globals.css'

// Authenticated client portal — never index any /portal route.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Verify the user has the client role (not admin_staff)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, is_admin_team, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    // No profile yet — go home to avoid redirect loops
    redirect('/')
  }

  // Detectar modo "ver portal como cliente" (admin previewing). El header lo
  // setea proxy.ts cuando un admin entra a /portal con ?as_client=<uuid>.
  const previewClientId = (await headers()).get('x-portal-preview-client')

  if (profile.is_admin_team && !previewClientId) {
    // Admin en /portal sin ?as_client → mandarlo a /admin como antes.
    redirect('/admin')
  }

  // Resolver nombre del cliente target para mostrar en el banner.
  let previewClientName: string | null = null
  if (previewClientId) {
    const svc = createServiceClient()
    const { data: target } = await svc
      .from('clients')
      .select('name')
      .eq('id', previewClientId)
      .single()
    previewClientName = target?.name ?? 'cliente desconocido'
  }

  // Helper para preservar ?as_client en links del nav cuando estamos en preview.
  const previewQS = previewClientId ? `?as_client=${previewClientId}` : ''

  return (
    <>
      {/* Banner de modo preview admin */}
      {previewClientId && (
        <div
          className="fixed top-0 inset-x-0 z-[60] h-9 flex items-center justify-center gap-3 bg-amber-500/95 text-amber-950 text-xs font-medium px-4"
          role="status"
        >
          <span>
            Modo preview — viendo el portal de <strong>{previewClientName}</strong>
          </span>
          <Link
            href={`/admin/clients/${previewClientId}`}
            className="underline hover:no-underline font-semibold"
          >
            Salir
          </Link>
        </div>
      )}

      {/* Top navigation */}
      <header
        className="fixed inset-x-0 z-50 h-14 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md"
        style={{ top: previewClientId ? '36px' : '0' }}
      >
        <div className="mx-auto max-w-6xl h-full px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <a href={`/portal${previewQS}`} className="flex items-center gap-2.5 group">
            <div className="w-5 h-5 relative opacity-80 group-hover:opacity-100 transition-opacity">
              <Image
                src="/favicon.ico"
                alt="XICO Films"
                fill
                className="object-contain"
                sizes="20px"
              />
            </div>
            <span className="text-white/70 group-hover:text-white text-xs font-medium tracking-widest uppercase transition-colors">
              XICO Films
            </span>
          </a>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-1">
              <a
                href={`/portal${previewQS}`}
                className="text-zinc-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                Proyectos
              </a>
              <a
                href={`/portal/calendario${previewQS}`}
                className="text-zinc-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                Calendario
              </a>
              <a
                href={`/portal/invoices${previewQS}`}
                className="text-zinc-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                Facturas
              </a>
              <a
                href={`/portal/archivos${previewQS}`}
                className="text-zinc-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                Archivos
              </a>
              <a
                href={`/portal/rendimiento${previewQS}`}
                className="text-zinc-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                Rendimiento
              </a>
            </nav>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span className="text-zinc-300 text-sm">
                {profile.full_name ?? profile.email ?? 'Cliente'}
              </span>
            </div>
            <PortalLogoutButton />
          </div>
        </div>
      </header>

      {/* Page content — offset for fixed nav; extra bottom space on mobile
          so the fixed tab bar never covers content. */}
      <div
        className="pb-24 sm:pb-0"
        style={{ paddingTop: previewClientId ? '92px' : '56px' }}
      >
        {children}
      </div>

      {/* Mobile bottom tab bar — desktop nav is hidden under `sm`. */}
      <PortalTabBar />
    </>
  )
}
