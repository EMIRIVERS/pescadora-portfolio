import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Sidebar from '@/components/admin/sidebar'

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

  return (
    <div
      className="admin-root"
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#000000',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        color: '#F5F5F7',
      }}
    >
      <Sidebar
        profile={{
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
        }}
      />
      <main
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
  )
}
