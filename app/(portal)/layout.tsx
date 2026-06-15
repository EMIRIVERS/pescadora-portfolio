import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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

  const navLinks = [
    { href: `/portal${previewQS}`, label: 'Proyectos' },
    { href: `/portal/calendario${previewQS}`, label: 'Calendario' },
    { href: `/portal/invoices${previewQS}`, label: 'Facturas' },
    { href: `/portal/archivos${previewQS}`, label: 'Archivos' },
    { href: `/portal/rendimiento${previewQS}`, label: 'Rendimiento' },
  ]

  return (
    <>
      <style>{`
        .portal-shell { background: #050505; min-height: 100vh; }
        .portal-nav-link {
          position: relative;
          font-family: var(--font-geist-mono), monospace;
          font-size: 0.68rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8a857d;
          padding: 0.35rem 0;
          transition: color 0.25s ease;
        }
        .portal-nav-link::after {
          content: '';
          position: absolute;
          left: 0; bottom: -2px;
          width: 0; height: 1px;
          background: #e8341a;
          transition: width 0.3s cubic-bezier(0.25,0.46,0.45,0.94);
        }
        .portal-nav-link:hover { color: #ede8e0; }
        .portal-nav-link:hover::after { width: 100%; }
        .portal-brand-mark {
          font-family: var(--font-geist-sans), sans-serif;
          font-weight: 900; letter-spacing: -0.04em;
          color: #ede8e0;
        }
      `}</style>

      <div className="portal-shell">
        {/* Banner de modo preview admin */}
        {previewClientId && (
          <div
            className="fixed top-0 inset-x-0 z-[60] h-9 flex items-center justify-center gap-3 px-4"
            role="status"
            style={{
              background: 'rgba(232,52,26,0.12)',
              borderBottom: '1px solid rgba(232,52,26,0.3)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#f0a99c',
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: '0.62rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <span>
              Modo preview — portal de <strong style={{ color: '#ede8e0' }}>{previewClientName}</strong>
            </span>
            <Link
              href={`/admin/clients/${previewClientId}`}
              className="underline hover:no-underline"
              style={{ color: '#e8341a', fontWeight: 700 }}
            >
              Salir
            </Link>
          </div>
        )}

        {/* Top navigation */}
        <header
          className="fixed inset-x-0 z-50"
          style={{
            top: previewClientId ? '36px' : '0',
            height: '60px',
            background: 'rgba(5,5,5,0.82)',
            borderBottom: '1px solid rgba(237,232,224,0.08)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div className="mx-auto max-w-6xl h-full px-4 sm:px-6 flex items-center justify-between">
            {/* Logo */}
            <a href={`/portal${previewQS}`} className="flex items-center gap-3 group">
              <span
                className="flex items-center justify-center"
                style={{
                  width: '26px', height: '26px',
                  border: '1px solid rgba(237,232,224,0.25)',
                  borderRadius: '6px',
                  fontSize: '15px',
                }}
              >
                <span className="portal-brand-mark">X</span>
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: '0.7rem',
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: '#ede8e0',
                }}
              >
                XICO Films
              </span>
            </a>

            {/* Right side */}
            <div className="flex items-center gap-6">
              <nav className="hidden sm:flex items-center gap-7">
                {navLinks.map((l) => (
                  <a key={l.label} href={l.href} className="portal-nav-link">
                    {l.label}
                  </a>
                ))}
              </nav>
              <div className="hidden sm:flex items-center gap-2.5">
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#e8341a', boxShadow: '0 0 6px rgba(232,52,26,0.7)' }} />
                <span
                  style={{
                    fontFamily: 'var(--font-geist-sans), sans-serif',
                    fontSize: '0.8rem',
                    color: '#b3ada3',
                  }}
                >
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
          style={{ paddingTop: previewClientId ? '96px' : '60px' }}
        >
          {children}
        </div>

        {/* Mobile bottom tab bar — desktop nav is hidden under `sm`. */}
        <PortalTabBar />
      </div>
    </>
  )
}
