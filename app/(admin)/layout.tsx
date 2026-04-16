import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Sidebar from '@/components/admin/sidebar'
import MobileNav from '@/components/admin/MobileNav'
import { ToastProvider } from '@/components/admin/ui'
import CommandPalette from '@/components/admin/CommandPalette'
import CommandPaletteButton from '@/components/admin/CommandPaletteButton'
import NotificationBell from '@/components/admin/NotificationBell'

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
      <CommandPalette />
      <div
        className="admin-root"
        style={{
          minHeight: '100vh',
          background: '#000000',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          color: '#F5F5F7',
        }}
      >
        {/* Mobile-only hamburger + drawer */}
        <MobileNav profile={profileData} />

        {/* Desktop layout: sidebar + content side by side */}
        <div style={{ display: 'flex' }}>
          <div className="sidebar-wrapper">
            <Sidebar profile={profileData} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Top bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '10px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              gap: 8,
            }}>
              <CommandPaletteButton />
              <NotificationBell />
            </div>
            <main
              className="admin-main-content"
              style={{
                flex: 1,
                minWidth: 0,
                overflowY: 'auto',
                padding: '32px 40px',
              }}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  )
}
