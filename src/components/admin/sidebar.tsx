'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Film,
  FolderKanban,
  Kanban,
  Users,
  UserCircle,
  Target,
  Zap,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'

// ─── Design tokens ──────────────────────────────────────────────────────────
const T = {
  bg: '#000000',
  surface1: '#111111',
  surface2: '#1C1C1E',
  surface3: '#2C2C2E',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  textPrimary: '#F5F5F7',
  textSecondary: '#86868B',
  textTertiary: '#48484A',
  accent: '#0071E3',
  accentRed: '#FF453A',
  radiusSm: '8px',
  radiusMd: '12px',
  radiusLg: '16px',
  font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
  fontMono: "'SF Mono', SFMono-Regular, ui-monospace, monospace",
} as const

// ─── Nav items ───────────────────────────────────────────────────────────────
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
    label: 'Portfolio',
    href: '/admin/portfolio',
    icon: <Film size={16} strokeWidth={1.5} />,
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
    label: 'Leads',
    href: '/admin/leads',
    icon: <Target size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Automatizaciones',
    href: '/admin/automatizaciones',
    icon: <Zap size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Equipo',
    href: '/admin/team',
    icon: <UserCircle size={16} strokeWidth={1.5} />,
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  profile: Pick<Profile, 'full_name' | 'email' | 'avatar_url'>
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [logoutHovered, setLogoutHovered] = useState(false)

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
      .toUpperCase() ?? '?'

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '220px',
        minWidth: '220px',
        minHeight: '100vh',
        background: T.surface1,
        borderRight: `1px solid rgba(255,255,255,0.06)`,
        fontFamily: T.font,
        flexShrink: 0,
      }}
    >
      {/* ── Wordmark ─────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            fontFamily: T.font,
            fontWeight: 700,
            fontSize: '18px',
            color: T.textPrimary,
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          XICO
        </div>
        <div
          style={{
            fontFamily: T.font,
            fontSize: '10px',
            color: T.textSecondary,
            letterSpacing: '0.3em',
            marginTop: '4px',
            textTransform: 'uppercase',
          }}
        >
          FILMS
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <NavLink key={item.href} item={item} active={active} />
          )
        })}
      </nav>

      {/* ── User footer ──────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: `1px solid ${T.border}`,
          padding: '12px 8px',
        }}
      >
        {/* User info row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            marginBottom: '4px',
          }}
        >
          {/* Avatar */}
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name ?? 'User avatar'}
              width={40}
              height={40}
              style={{
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: T.surface3,
                border: `1px solid ${T.borderStrong}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: T.font,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: T.textSecondary,
                  userSelect: 'none',
                }}
              >
                {initials}
              </span>
            </div>
          )}

          {/* Name + email */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontFamily: T.font,
                fontSize: '13px',
                fontWeight: 500,
                color: T.textPrimary,
                margin: 0,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {profile.full_name ?? 'Usuario'}
            </p>
            <p
              style={{
                fontFamily: T.font,
                fontSize: '11px',
                color: T.textSecondary,
                margin: '2px 0 0',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {profile.email ?? ''}
            </p>
          </div>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={handleLogout}
          onMouseEnter={() => setLogoutHovered(true)}
          onMouseLeave={() => setLogoutHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px 12px',
            borderRadius: T.radiusSm,
            border: 'none',
            background: logoutHovered ? 'rgba(255,69,58,0.08)' : 'transparent',
            color: logoutHovered ? T.accentRed : T.textSecondary,
            fontFamily: T.font,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'background 0.15s ease, color 0.15s ease',
            textAlign: 'left',
          }}
        >
          <LogOut
            size={15}
            strokeWidth={1.5}
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          />
          Cerrar sesion
        </button>
      </div>
    </aside>
  )
}

// ─── NavLink sub-component ───────────────────────────────────────────────────
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const [hovered, setHovered] = useState(false)

  const bg = active
    ? 'rgba(255,255,255,0.08)'
    : hovered
    ? 'rgba(255,255,255,0.04)'
    : 'transparent'

  const color = active
    ? '#F5F5F7'
    : hovered
    ? '#aeaeb2'
    : '#86868B'

  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: bg,
        color,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        fontSize: '13px',
        fontWeight: active ? 500 : 400,
        textDecoration: 'none',
        transition: 'background 0.15s ease, color 0.15s ease',
        userSelect: 'none',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          color,
          transition: 'color 0.15s ease',
        }}
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  )
}
