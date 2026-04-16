'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard,
  Film,
  FolderKanban,
  Kanban,
  Calendar,
  Users,
  Users2,
  Target,
  Zap,
  Search,
  BarChart2,
  Activity,
  LogOut,
  Receipt,
  ImageIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'
import ThemeSwitcher, {
  THEMES,
  type Theme,
  STORAGE_KEY,
  getThemeById,
} from '@/components/admin/ThemeSwitcher'

// ─── Static design tokens (non-theme values) ─────────────────────────────────
const T = {
  surface3: '#2C2C2E',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  textPrimary: '#F5F5F7',
  textSecondary: '#86868B',
  textTertiary: '#48484A',
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
    label: 'Media',
    href: '/admin/media',
    icon: <ImageIcon size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Proyectos',
    href: '/admin/projects',
    icon: <FolderKanban size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Tareas',
    href: '/admin/kanban',
    icon: <Kanban size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Calendario',
    href: '/admin/calendar',
    icon: <Calendar size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Clientes',
    href: '/admin/clients',
    icon: <Users size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Facturas',
    href: '/admin/invoices',
    icon: <Receipt size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Leads',
    href: '/admin/leads',
    icon: <Target size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Equipo',
    href: '/admin/team',
    icon: <Users2 size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Automatizaciones',
    href: '/admin/automatizaciones',
    icon: <Zap size={16} strokeWidth={1.5} />,
  },
]

const NAV_ITEMS_SECONDARY: NavItem[] = [
  {
    label: 'Buscar',
    href: '/admin/buscar',
    icon: <Search size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Reportes',
    href: '/admin/reportes',
    icon: <BarChart2 size={16} strokeWidth={1.5} />,
  },
  {
    label: 'Actividad',
    href: '/admin/actividad',
    icon: <Activity size={16} strokeWidth={1.5} />,
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  profile: Pick<Profile, 'full_name' | 'email' | 'avatar_url'>
}

// ─── Helper: resolve theme colours from localStorage ─────────────────────────
function resolveStoredTheme(): Theme {
  if (typeof window === 'undefined') return THEMES[0]
  return getThemeById(localStorage.getItem(STORAGE_KEY) ?? '')
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [logoutHovered, setLogoutHovered] = useState(false)
  const [searchHovered, setSearchHovered] = useState(false)
  const [newLeadsCount, setNewLeadsCount] = useState(0)

  const openCommandPalette = useCallback(() => {
    window.dispatchEvent(new Event('open-command-palette'))
  }, [])

  // Dynamic theme colours — initialised from localStorage, updated on change
  const [themeColors, setThemeColors] = useState<Theme>(resolveStoredTheme)

  // Listen for theme changes dispatched by ThemeSwitcher (same tab)
  useEffect(() => {
    function onThemeChange(e: Event) {
      const theme = (e as CustomEvent<Theme>).detail
      setThemeColors(theme)
    }
    window.addEventListener('dash-theme-change', onThemeChange)
    return () => window.removeEventListener('dash-theme-change', onThemeChange)
  }, [])

  // Also react to storage events (other tabs)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        setThemeColors(getThemeById(e.newValue))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const supabaseRT = createClient()

    async function fetchNewLeads() {
      const { count } = await supabaseRT
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new')
      setNewLeadsCount(count ?? 0)
    }

    // Initial fetch
    void fetchNewLeads()

    // Realtime: re-fetch on any INSERT / UPDATE / DELETE in leads
    const channel = supabaseRT
      .channel('sidebar-leads-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => { void fetchNewLeads() },
      )
      .subscribe()

    return () => {
      void supabaseRT.removeChannel(channel)
    }
  }, [])

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
      data-dash-sidebar
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '220px',
        minWidth: '220px',
        minHeight: '100vh',
        background: themeColors.surface1,
        borderRight: `1px solid rgba(255,255,255,0.06)`,
        fontFamily: T.font,
        flexShrink: 0,
        transition: 'background 0.25s ease',
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

      {/* ── Command palette trigger ──────────────────────────────────────── */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}` }}>
        <button
          type="button"
          onClick={openCommandPalette}
          onMouseEnter={() => setSearchHovered(true)}
          onMouseLeave={() => setSearchHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '7px 10px',
            borderRadius: T.radiusSm,
            border: `1px solid ${searchHovered ? T.borderStrong : T.border}`,
            background: searchHovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
            cursor: 'pointer',
            fontFamily: T.font,
            fontSize: '13px',
            color: T.textSecondary,
            transition: 'background 0.15s ease, border-color 0.15s ease',
          }}
          aria-label="Abrir busqueda (Cmd+K)"
        >
          <Search size={13} strokeWidth={1.6} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, textAlign: 'left' }}>Buscar...</span>
          <kbd
            style={{
              fontSize: '10px',
              color: T.textTertiary,
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${T.border}`,
              borderRadius: '4px',
              padding: '1px 5px',
              fontFamily: T.font,
              lineHeight: 1.5,
            }}
          >
            K
          </kbd>
        </button>
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
            <NavLink
              key={item.href}
              item={item}
              active={active}
              accent={themeColors.accent}
              badge={item.label === 'Leads' && newLeadsCount > 0 ? newLeadsCount : undefined}
            />
          )
        })}

        {/* Separator before secondary tools */}
        <div
          style={{
            height: '1px',
            background: 'rgba(255,255,255,0.06)',
            margin: '6px 12px',
          }}
        />

        {NAV_ITEMS_SECONDARY.map((item) => {
          const active = isActive(item.href)
          return (
            <NavLink key={item.href} item={item} active={active} accent={themeColors.accent} />
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

        {/* Theme switcher */}
        <ThemeSwitcher />

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
function NavLink({
  item,
  active,
  accent,
  badge,
}: {
  item: NavItem
  active: boolean
  accent: string
  badge?: number
}) {
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
        borderLeft: active ? `2px solid ${accent}` : '2px solid transparent',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          color: active ? accent : color,
          transition: 'color 0.15s ease',
        }}
      >
        {item.icon}
      </span>
      {item.label}
      {badge !== undefined && (
        <span
          style={{
            backgroundColor: '#FF453A',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 10,
            marginLeft: 'auto',
            minWidth: 18,
            textAlign: 'center',
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}
