'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Kanban,
  Users,
  UserCircle,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: <LayoutDashboard size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Proyectos',
    href: '/admin/projects',
    icon: <FolderKanban size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Kanban',
    href: '/admin/kanban',
    icon: <Kanban size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Clientes',
    href: '/admin/clients',
    icon: <Users size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Equipo',
    href: '/admin/team',
    icon: <UserCircle size={16} strokeWidth={1.5} />,
  },
]

interface SidebarProps {
  profile: Pick<Profile, 'full_name' | 'email' | 'avatar_url'>
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const initials =
    profile.full_name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? '??'

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-[#0a0a0a] border-r border-[#1a1a1a] flex-shrink-0">
      {/* Wordmark */}
      <div className="px-5 pt-6 pb-5 border-b border-[#1a1a1a]">
        <span className="font-mono text-[10px] tracking-[0.4em] text-[#888] uppercase">
          Pescadora
        </span>
        <p className="font-mono text-[9px] tracking-[0.2em] text-[#444] uppercase mt-0.5">
          Admin
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-mono tracking-wide transition-colors',
                active
                  ? 'bg-[#1c1c1c] text-[#e8e8e8]'
                  : 'text-[#555] hover:text-[#aaa] hover:bg-[#111]',
              ].join(' ')}
            >
              <span
                className={active ? 'text-[#e8e8e8]' : 'text-[#444]'}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-[#1a1a1a] pt-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? 'User avatar'}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-mono text-[#888]">{initials}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-mono text-[#ccc] truncate leading-tight">
              {profile.full_name ?? 'Usuario'}
            </p>
            <p className="text-[9px] font-mono text-[#444] truncate leading-tight mt-0.5">
              {profile.email ?? ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-sm text-xs font-mono text-[#444] hover:text-[#888] hover:bg-[#111] transition-colors"
        >
          <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
          Cerrar sesion
        </button>
      </div>
    </aside>
  )
}
