import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/admin/sidebar'
import { QueryProvider } from '@/providers/query-provider'

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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, is_admin_team')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.is_admin_team) {
    redirect('/login')
  }

  return (
    <QueryProvider>
      <div className="flex min-h-screen bg-[#080808] text-[#e8e8e8]">
        <Sidebar
          profile={{
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
          }}
        />
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </QueryProvider>
  )
}
