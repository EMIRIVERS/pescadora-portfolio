import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Sidebar from '@/components/admin/sidebar'
import MobileNav from '@/components/admin/MobileNav'
import { ToastProvider } from '@/components/admin/ui'
import CommandPalette from '@/components/admin/CommandPalette'
import CommandPaletteButton from '@/components/admin/CommandPaletteButton'
import NotificationBell from '@/components/admin/NotificationBell'
import NavProgress from '@/components/admin/NavProgress'
import PageTransition from '@/components/admin/PageTransition'
import PageBreadcrumb from '@/components/admin/PageBreadcrumb'

export default async function AdminLayout({
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

  // Use service client to bypass RLS — auth.getUser() already verified identity
  const service = createServiceClient()
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('id, full_name, email, avatar_url, is_admin_team')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.is_admin_team) {
    redirect('/login')
  }

  const profileData = {
    full_name: profile.full_name,
    email: profile.email,
    avatar_url: profile.avatar_url,
  }

  return (
    <ToastProvider>
      <NavProgress />
      <CommandPalette />
      <div
        className="admin-root"
        style={{
          minHeight: '100vh',
          background: 'var(--dash-bg)',
          fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          color: 'var(--dash-text-primary)',
          transition: 'background 0.2s ease, color 0.2s ease',
        }}
      >
        {/* Mobile-only hamburger + drawer */}
        <MobileNav profile={profileData} />

        {/* Desktop layout: sidebar + content side by side */}
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div
            className="sidebar-wrapper"
            style={{ position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}
          >
            <Sidebar profile={profileData} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Top bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              height: 48,
              borderBottom: '1px solid var(--dash-border)',
              background: 'var(--dash-surface-1)',
              gap: 8,
              flexShrink: 0,
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}>
              <PageBreadcrumb />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CommandPaletteButton />
                <NotificationBell />
              </div>
            </div>
            <main
              className="admin-main-content"
              style={{
                flex: 1,
                minWidth: 0,
                padding: '28px 32px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  )
}
