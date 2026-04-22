'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  FileText,
  Sun,
  Moon,
  ChevronLeft,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'
import ThemeSwitcher, {
  THEMES,
  type Theme,
  STORAGE_KEY,
  getThemeById,
  applyTheme,
  applyLightTheme,
} from '@/components/admin/ThemeSwitcher'

const T = {
  accentRed: '#FF453A',
  font: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
} as const

const MODE_KEY = 'dash-mode'
const COLLAPSED_KEY = 'sidebar-collapsed'
const SIDEBAR_FULL = 220
const SIDEBAR_COLLAPSED = 52

// ─── Nav groups ──────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badgeKey?: 'leads' | 'invoices'
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { label: 'Dashboard', href: '/admin',           icon: <LayoutDashboard size={15} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Producción',
    items: [
      { label: 'Portfolio',   href: '/admin/portfolio', icon: <Film          size={15} strokeWidth={1.5} /> },
      { label: 'Media',       href: '/admin/media',     icon: <ImageIcon     size={15} strokeWidth={1.5} /> },
      { label: 'Proyectos',   href: '/admin/projects',  icon: <FolderKanban  size={15} strokeWidth={1.5} /> },
      { label: 'Tareas',      href: '/admin/kanban',    icon: <Kanban        size={15} strokeWidth={1.5} /> },
      { label: 'Calendario',  href: '/admin/calendar',  icon: <Calendar      size={15} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Negocio',
    items: [
      { label: 'Leads',       href: '/admin/leads',     icon: <Target        size={15} strokeWidth={1.5} />, badgeKey: 'leads' },
      { label: 'Clientes',    href: '/admin/clients',   icon: <Users         size={15} strokeWidth={1.5} /> },
      { label: 'Facturas',    href: '/admin/invoices',  icon: <Receipt       size={15} strokeWidth={1.5} />, badgeKey: 'invoices' },
      { label: 'Propuestas',  href: '/admin/proposals', icon: <FileText      size={15} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Equipo',          href: '/admin/team',             icon: <Users2   size={15} strokeWidth={1.5} /> },
      { label: 'Automatizaciones',href: '/admin/automatizaciones', icon: <Zap      size={15} strokeWidth={1.5} /> },
      { label: 'Buscar',          href: '/admin/buscar',           icon: <Search   size={15} strokeWidth={1.5} /> },
      { label: 'Reportes',        href: '/admin/reportes',         icon: <BarChart2 size={15} strokeWidth={1.5} /> },
      { label: 'Actividad',       href: '/admin/actividad',        icon: <Activity  size={15} strokeWidth={1.5} /> },
    ],
  },
]

interface BadgeCounts { leads: number; invoices: number }

interface SidebarProps {
  profile: Pick<Profile, 'full_name' | 'email' | 'avatar_url'>
}

function resolveStoredTheme(): Theme {
  if (typeof window === 'undefined') return THEMES[0]
  return getThemeById(localStorage.getItem(STORAGE_KEY) ?? '')
}
function resolveStoredMode(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(MODE_KEY) === 'light'
}
function resolveStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(COLLAPSED_KEY) === 'true'
}

// ─── NavItem component ────────────────────────────────────────────────────────

function NavLink({
  item,
  active,
  accent,
  badge,
  collapsed,
}: {
  item: NavItem
  active: boolean
  accent: string
  badge?: number
  collapsed: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const hasBadge = (badge ?? 0) > 0

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 8,
        padding: collapsed ? '7px 0' : '6px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 8,
        color: active ? accent : hovered ? 'var(--dash-text-primary)' : 'var(--dash-text-secondary)',
        fontFamily: T.font,
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        textDecoration: 'none',
        transition: 'color 0.12s',
        userSelect: 'none',
      }}
    >
      {/* Backgrounds */}
      {hovered && !active && (
        <motion.span
          layoutId="nav-hover-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'var(--dash-surface-2)', zIndex: -1 }}
        />
      )}
      {active && (
        <span style={{ position: 'absolute', inset: 0, borderRadius: 8, background: `${accent}14`, zIndex: -1 }} />
      )}

      {/* Icon */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          color: active ? accent : hovered ? 'var(--dash-text-primary)' : 'var(--dash-text-tertiary)',
          transition: 'color 0.12s',
          position: 'relative',
        }}
      >
        {item.icon}
        {collapsed && hasBadge && (
          <span style={{
            position: 'absolute', top: -3, right: -4,
            background: T.accentRed, color: '#fff',
            fontSize: 8, fontWeight: 700, lineHeight: 1,
            padding: '1px 3px', borderRadius: 6, minWidth: 12, textAlign: 'center',
          }}>
            {(badge ?? 0) > 9 ? '9+' : badge}
          </span>
        )}
      </span>

      {/* Label + badge */}
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}
          >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
            {hasBadge && (
              <span style={{
                background: T.accentRed, color: '#fff',
                fontSize: 9, fontWeight: 700, lineHeight: 1,
                padding: '2px 5px', borderRadius: 6, flexShrink: 0,
              }}>
                {(badge ?? 0) > 9 ? '9+' : badge}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({ profile }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()

  const [isLight,   setIsLight]   = useState(resolveStoredMode)
  const [collapsed, setCollapsed] = useState(resolveStoredCollapsed)
  const [badges,    setBadges]    = useState<BadgeCounts>({ leads: 0, invoices: 0 })
  const [themeColors, setThemeColors] = useState<Theme>(resolveStoredTheme)
  const [logoutHovered, setLogoutHovered] = useState(false)

  const openCommandPalette = useCallback(() => {
    window.dispatchEvent(new Event('open-command-palette'))
  }, [])

  // Theme sync
  useEffect(() => {
    function onThemeChange(e: Event) {
      const theme = (e as CustomEvent<Theme>).detail
      setThemeColors(theme)
      if (localStorage.getItem(MODE_KEY) === 'light') applyLightTheme(theme)
    }
    window.addEventListener('dash-theme-change', onThemeChange)
    return () => window.removeEventListener('dash-theme-change', onThemeChange)
  }, [])

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) setThemeColors(getThemeById(e.newValue))
      if (e.key === MODE_KEY) {
        const light = e.newValue === 'light'
        setIsLight(light)
        document.documentElement.dataset.mode = light ? 'light' : 'dark'
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (isLight) applyLightTheme(themeColors)
    else document.documentElement.setAttribute('data-mode', 'dark')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Badges
  useEffect(() => {
    const db = createClient()
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    const today = new Date().toISOString().slice(0, 10)

    async function fetchBadges() {
      const [leadsRes, invoicesRes] = await Promise.all([
        db.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new').gte('created_at', yesterday),
        (db.from as (t: string) => ReturnType<typeof db.from>)('invoices')
          .select('id', { count: 'exact', head: true }).eq('status', 'sent').lt('due_date', today),
      ])
      setBadges({ leads: leadsRes.count ?? 0, invoices: invoicesRes.count ?? 0 })
    }

    void fetchBadges()
    const channel = db.channel('sidebar-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => void fetchBadges())
      .subscribe()
    return () => { void db.removeChannel(channel) }
  }, [])

  function toggleMode() {
    const next = !isLight
    setIsLight(next)
    localStorage.setItem(MODE_KEY, next ? 'light' : 'dark')
    if (next) applyLightTheme(themeColors)
    else { document.documentElement.setAttribute('data-mode', 'dark'); applyTheme(themeColors) }
  }

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSED_KEY, String(next))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  }

  const initials = profile.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL
  const accent = themeColors.accent

  return (
    <aside
      data-dash-sidebar
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: '100%',
        background: 'var(--dash-surface-1)',
        borderRight: '1px solid var(--dash-border)',
        fontFamily: T.font,
        flexShrink: 0,
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* ── Logo + collapse ──────────────────────────────────────────────── */}
      <div style={{
        padding: collapsed ? '14px 0' : '16px 16px 14px',
        borderBottom: '1px solid var(--dash-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
      }}>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: 15, color: 'var(--dash-text-primary)', letterSpacing: '-0.02em' }}>
                XICO
              </span>
              <span style={{ fontFamily: T.font, fontSize: 8, color: 'var(--dash-text-tertiary)', letterSpacing: '0.3em', marginLeft: 4, textTransform: 'uppercase' }}>
                FILMS
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir' : 'Colapsar'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 6,
            border: '1px solid var(--dash-border)',
            background: 'transparent',
            color: 'var(--dash-text-tertiary)',
            cursor: 'pointer', flexShrink: 0, padding: 0,
            transition: 'color 0.12s, background 0.12s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--dash-surface-2)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-tertiary)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={12} strokeWidth={2} />
          </motion.div>
        </button>
      </div>

      {/* ── Search trigger ───────────────────────────────────────────────── */}
      <div style={{ padding: collapsed ? '8px 6px' : '8px 10px', borderBottom: '1px solid var(--dash-border)' }}>
        <button
          onClick={openCommandPalette}
          aria-label="Buscar (⌘K)"
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 7,
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%',
            padding: collapsed ? '6px 0' : '6px 10px',
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: T.font,
            fontSize: 13,
            color: 'var(--dash-text-tertiary)',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.background = 'var(--dash-surface-2)'
            btn.style.color = 'var(--dash-text-secondary)'
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.background = 'transparent'
            btn.style.color = 'var(--dash-text-tertiary)'
          }}
        >
          <Search size={13} strokeWidth={1.6} style={{ flexShrink: 0 }} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1 }}
              >
                <span style={{ flex: 1, textAlign: 'left' }}>Buscar...</span>
                <kbd style={{
                  fontSize: 10, color: 'var(--dash-text-tertiary)',
                  background: 'var(--dash-surface-2)',
                  border: '1px solid var(--dash-border)',
                  borderRadius: 4, padding: '1px 5px', fontFamily: T.font, lineHeight: 1.5,
                }}>K</kbd>
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: collapsed ? '8px 6px' : '8px 10px', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_GROUPS.map((group, gIndex) => (
          <div key={gIndex} style={{ marginBottom: group.label ? 16 : 8 }}>
            {/* Section label */}
            <AnimatePresence>
              {group.label && !collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    fontFamily: T.font,
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--dash-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    margin: `${gIndex === 0 ? 0 : 8}px 0 4px 10px`,
                    userSelect: 'none',
                  }}
                >
                  {group.label}
                </motion.p>
              )}
              {group.label && collapsed && (
                <div style={{ height: 1, background: 'var(--dash-border)', margin: `${gIndex === 0 ? 4 : 10}px 4px 6px` }} />
              )}
            </AnimatePresence>

            {group.items.map((item) => {
              const badge = item.badgeKey ? badges[item.badgeKey] : undefined
              return (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  accent={accent}
                  badge={badge}
                  collapsed={collapsed}
                />
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--dash-border)', padding: collapsed ? '8px 6px' : '8px 10px 10px' }}>

        {/* User row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '6px 0' : '6px 8px',
          borderRadius: 8,
          marginBottom: 4,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name ?? ''}
              width={28} height={28}
              style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--dash-surface-3)',
              border: '1px solid var(--dash-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontFamily: T.font, fontSize: 11, fontWeight: 600, color: 'var(--dash-text-secondary)' }}>
                {initials}
              </span>
            </div>
          )}

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{ minWidth: 0, flex: 1 }}
              >
                <p style={{ fontFamily: T.font, fontSize: 13, fontWeight: 500, color: 'var(--dash-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.full_name ?? 'Usuario'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls row: mode + theme + logout */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          justifyContent: collapsed ? 'center' : 'flex-start',
          flexWrap: 'wrap',
        }}>
          {/* Mode toggle */}
          <button
            onClick={toggleMode}
            title={isLight ? 'Modo oscuro' : 'Modo claro'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 7,
              border: '1px solid var(--dash-border)',
              background: 'transparent',
              color: 'var(--dash-text-tertiary)',
              cursor: 'pointer', flexShrink: 0,
              transition: 'color 0.12s, background 0.12s',
            }}
            onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'var(--dash-text-primary)'; b.style.background = 'var(--dash-surface-2)' }}
            onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'var(--dash-text-tertiary)'; b.style.background = 'transparent' }}
          >
            {isLight ? <Moon size={12} strokeWidth={1.8} /> : <Sun size={12} strokeWidth={1.8} />}
          </button>

          {/* Theme switcher */}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{ flex: 1, minWidth: 0 }}
              >
                <ThemeSwitcher />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logout */}
          <button
            onClick={handleLogout}
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
            title="Cerrar sesión"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 7,
              border: '1px solid var(--dash-border)',
              background: logoutHovered ? 'rgba(255,69,58,0.1)' : 'transparent',
              color: logoutHovered ? T.accentRed : 'var(--dash-text-tertiary)',
              cursor: 'pointer', flexShrink: 0,
              transition: 'color 0.15s, background 0.15s',
            }}
          >
            <LogOut size={12} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  )
}
