import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import PortalLogoutButton from '@/components/portal/logout-button'
import '../globals.css'

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

  if (profile.is_admin_team) {
    // Admins belong in /admin, not /portal
    redirect('/admin')
  }

  return (
    <>
      {/* Top navigation */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl h-full px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <a href="/portal" className="flex items-center gap-2.5 group">
            <div className="w-5 h-5 relative opacity-80 group-hover:opacity-100 transition-opacity">
              <Image
                src="/favicon.ico"
                alt="Pescadora"
                fill
                className="object-contain"
                sizes="20px"
              />
            </div>
            <span className="text-white/70 group-hover:text-white text-xs font-medium tracking-widest uppercase transition-colors">
              Pescadora
            </span>
          </a>

          {/* Right side */}
          <div className="flex items-center gap-4">
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

      {/* Page content — offset for fixed nav */}
      <div className="pt-14">{children}</div>
    </>
  )
}
