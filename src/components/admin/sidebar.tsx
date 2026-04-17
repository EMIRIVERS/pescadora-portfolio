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
import type { Profile, ProjectStatus } from '@/lib/supabase/types'
import ThemeSwitcher, {
  THEMES,
  type Theme,
  STORAGE_KEY,
  getThemeById,
  applyTheme,
  applyLightTheme,
} from '@/components/admin/ThemeSwitcher'

// ─── Static design tokens (CSS-variable-based) ────────────────────────────────
const T = {
  accentRed: '#FF453A',
  radiusSm: '8px',
  radiusMd: '12px',
  radiusLg: '16px',
  font: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
} as const

const MODE_KEY = 'dash-mode'
const COLLAPSED_KEY = 'sidebar-collapsed'

const SIDEBAR_FULL = 240
const SIDEBAR_COLLAPSED = 48

// ─── Status colours for project quick-switcher ───────────────────────────────
const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  pre_production:  '#FF9F0A',
  production:      '#0071E3',
  post_production: '#BF5AF2',
  delivered:       '#30D158',
}

// ─── Keyboard shortcut hints per href ────────────────────────────────────────
const NAV_SHORTCUTS: Record<string, string> = {
  '/admin':                  'G+H',
  '/admin/portfolio':        'G+F',
  '/admin/media':            'G+M',
  '/admin/projects':         'G+P',
  '/admin/kanban':           'G+T',
  '/admin/calendar':         'G+C',
  '/admin/clients':          'G+L',
  '/admin/invoices':         'G+I',
  '/admin/proposals':        'G+R',
  '/admin/leads':            'G+E',
  '/admin/team':             'G+Q',
  '/admin/automatizaciones': 'G+A',
  '/admin/buscar':           'G+B',
  '/admin/reportes':         'G+S',
  '/admin/actividad':        'G+V',
}

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
    label: 'Propuestas',
    href: '/admin/proposals',
    icon: <FileText size={16} strokeWidth={1.5} />,
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

// ─── Badge counts shape ───────────────────────────────────────────────────────
interface BadgeCounts {
  leads: number
  deliverables: number
  invoices: number
}

// ─── Quick project shape ──────────────────────────────────────────────────────
interface QuickProject {
  id: string
  title: string
  status: ProjectStatus
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  profile: Pick<Profile, 'full_name' | 'email' | 'avatar_url'>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str
}

function formatBadge(count: number): string {
  return count >= 10 ? '9+' : String(count)
}

// ─── AnimatedBadge sub-component ─────────────────────────────────────────────
function AnimatedBadge({
  count,
  layoutId,
  style,
}: {
  count: number
  layoutId: string
  style: React.CSSProperties
}) {
  return (
    <motion.span
      key={count}
      layoutId={layoutId}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      style={style}
    >
      {formatBadge(count)}
    </motion.span>
  )
}

// ─── NavLink sub-component ───────────────────────────────────────────────────
function NavLink({
  item,
  active,
  accent,
  badge,
  collapsed,
  hoveredHref,
  onHoverStart,
  onHoverEnd,
}: {
  item: NavItem
  active: boolean
  accent: string
  badge?: number
  collapsed: boolean
  hoveredHref: string | null
  onHoverStart: (href: string) => void
  onHoverEnd: () => void
}) {
  const hovered = hoveredHref === item.href
  const shortcut = NAV_SHORTCUTS[item.href]
  const hasBadge = badge !== undefined && badge > 0

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onMouseEnter={() => onHoverStart(item.href)}
      onMouseLeave={onHoverEnd}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : '9px',
        padding: collapsed ? '8px 0' : '8px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: '10px',
        background: 'transparent',
        color: active
          ? accent
          : hovered
          ? 'var(--dash-text-primary)'
          : 'var(--dash-text-secondary)',
        fontFamily: T.font,
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        textDecoration: 'none',
        transition: 'color 0.15s ease',
        userSelect: 'none',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      {/* Hover background — slides between items via layoutId */}
      {hovered && !active && (
        <motion.div
          layoutId="nav-hover-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '10px',
            background: 'var(--dash-surface-2)',
            zIndex: -1,
          }}
        />
      )}

      {/* Active background */}
      {active && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '10px',
            background: `${accent}18`,
            zIndex: -1,
          }}
        />
      )}

      {/* Active indicator bar — slides via layoutId */}
      {active && (
        <motion.span
          layoutId="nav-active-indicator"
          style={{
            position: 'absolute',
            left: 0,
            top: '20%',
            height: '60%',
            width: '2px',
            backgroundColor: accent,
            borderRadius: '0 2px 2px 0',
            flexShrink: 0,
          }}
        />
      )}

      {/* Icon — wraps badge pill in collapsed mode */}
      <span
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          color: active
            ? accent
            : hovered
            ? 'var(--dash-text-primary)'
            : 'var(--dash-text-tertiary)',
          transition: 'color 0.15s ease',
          position: 'relative',
        }}
      >
        {item.icon}
        {/* Badge overlaid on icon in collapsed mode */}
        {collapsed && hasBadge && (
          <AnimatePresence mode="wait">
            <AnimatedBadge
              key={`collapsed-badge-${item.href}`}
              count={badge}
              layoutId={`badge-${item.href}-collapsed`}
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-5px',
                backgroundColor: T.accentRed,
                color: '#fff',
                fontSize: '8px',
                fontWeight: 700,
                lineHeight: 1,
                padding: '2px 3px',
                borderRadius: '10px',
                minWidth: '13px',
                textAlign: 'center',
                pointerEvents: 'none',
                zIndex: 1,
                fontFamily: T.font,
                display: 'inline-block',
              }}
            />
          </AnimatePresence>
        )}
      </span>

      {/* Text content — fades in/out on collapse */}
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              flex: 1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </span>

            {/* Badge pill in expanded mode */}
            {hasBadge && (
              <AnimatePresence mode="wait">
                <AnimatedBadge
                  key={`expanded-badge-${item.href}`}
                  count={badge}
                  layoutId={`badge-${item.href}-expanded`}
                  style={{
                    backgroundColor: T.accentRed,
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: '2px 5px',
                    borderRadius: '10px',
                    minWidth: '14px',
                    textAlign: 'center',
                    flexShrink: 0,
                    fontFamily: T.font,
                    display: 'inline-block',
                  }}
                />
              </AnimatePresence>
            )}

            {/* Keyboard shortcut hint — dim, monospace, hover only */}
            {hovered && shortcut && !hasBadge && (
              <span
                style={{
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  color: 'var(--dash-text-tertiary)',
                  opacity: 0.55,
                  flexShrink: 0,
                  letterSpacing: '0.02em',
                }}
              >
                {shortcut}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  )
}

// ─── QuickProjectLink sub-component ──────────────────────────────────────────
function QuickProjectLink({
  project,
  accent,
  index,
}: {
  project: QuickProject
  accent: string
  index: number
}) {
  const [hovered, setHovered] = useState(false)
  const dotColor = PROJECT_STATUS_COLORS[project.status] ?? accent

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.07 }}
    >
      <Link
        href={`/admin/projects/${project.id}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 10px',
          borderRadius: '8px',
          background: hovered ? 'var(--dash-surface-2)' : 'transparent',
          textDecoration: 'none',
          transition: 'background 0.15s ease',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: T.font,
            fontSize: '12px',
            color: hovered ? 'var(--dash-text-primary)' : 'var(--dash-text-secondary)',
            transition: 'color 0.15s ease',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {truncate(project.title, 20)}
        </span>
      </Link>
    </motion.div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [logoutHovered, setLogoutHovered] = useState(false)
  const [searchHovered, setSearchHovered] = useState(false)
  const [isLight, setIsLight] = useState(resolveStoredMode)
  const [collapsed, setCollapsed] = useState(resolveStoredCollapsed)
  const [badges, setBadges] = useState<BadgeCounts>({ leads: 0, deliverables: 0, invoices: 0 })
  const [quickProjects, setQuickProjects] = useState<QuickProject[]>([])
  // Tracks which nav href is currently hovered — shared across all NavLinks
  // so the sliding hover-bg layoutId works correctly.
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)

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
      if (localStorage.getItem(MODE_KEY) === 'light') {
        applyLightTheme(theme)
      }
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
      if (e.key === MODE_KEY) {
        const light = e.newValue === 'light'
        setIsLight(light)
        document.documentElement.dataset.mode = light ? 'light' : 'dark'
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Apply initial mode on mount
  useEffect(() => {
    if (isLight) {
      applyLightTheme(themeColors)
    } else {
      document.documentElement.setAttribute('data-mode', 'dark')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleMode() {
    const next = !isLight
    setIsLight(next)
    localStorage.setItem(MODE_KEY, next ? 'light' : 'dark')
    if (next) {
      applyLightTheme(themeColors)
    } else {
      document.documentElement.setAttribute('data-mode', 'dark')
      applyTheme(themeColors)
    }
  }

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSED_KEY, String(next))
  }

  // ── Fetch badge counts on mount ─────────────────────────────────────────
  useEffect(() => {
    const db = createClient()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    async function fetchBadges() {
      const [leadsRes, deliverablesRes, invoicesRes] = await Promise.all([
        db
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new')
          .lt('created_at', yesterday),
        db
          .from('project_deliverables')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'review'),
        // invoices table exists in DB but is not in the typed schema yet — use
        // a type assertion to pass the compiler while keeping strict-mode elsewhere.
        (db.from as (table: string) => ReturnType<typeof db.from>)('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent')
          .lt('due_date', today),
      ])

      setBadges({
        leads:         leadsRes.count ?? 0,
        deliverables:  deliverablesRes.count ?? 0,
        invoices:      invoicesRes.count ?? 0,
      })
    }

    void fetchBadges()

    const channel = db
      .channel('sidebar-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        void fetchBadges()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_deliverables' }, () => {
        void fetchBadges()
      })
      .subscribe()

    return () => { void db.removeChannel(channel) }
  }, [])

  // ── Fetch 3 most-recently-updated projects on mount ─────────────────────
  useEffect(() => {
    const db = createClient()

    async function fetchProjects() {
      const { data } = await db
        .from('projects')
        .select('id, title, status')
        .order('updated_at', { ascending: false })
        .limit(3)

      if (data) {
        setQuickProjects(
          data.map((p) => ({
            id:     p.id,
            title:  p.title,
            status: p.status,
          }))
        )
      }
    }

    void fetchProjects()
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

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL

  return (
    <aside
      data-dash-sidebar
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: `${sidebarWidth}px`,
        minWidth: `${sidebarWidth}px`,
        minHeight: '100vh',
        background: 'var(--dash-surface-1)',
        borderRight: '1px solid var(--dash-border)',
        fontFamily: T.font,
        flexShrink: 0,
        transition: 'width 0.2s ease, min-width 0.2s ease, background 0.2s ease, border-color 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* ── Wordmark + collapse toggle ────────────────────────────────────── */}
      <div
        style={{
          padding: collapsed ? '16px 0' : '22px 20px 18px',
          borderBottom: '1px solid var(--dash-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div
                style={{
                  fontFamily: T.font,
                  fontWeight: 700,
                  fontSize: '17px',
                  color: 'var(--dash-text-primary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                XICO
              </div>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: '9px',
                  color: 'var(--dash-text-tertiary)',
                  letterSpacing: '0.35em',
                  marginTop: '4px',
                  textTransform: 'uppercase',
                }}
              >
                FILMS
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle with rotating chevron */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menu' : 'Colapsar menu'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            border: '1px solid var(--dash-border-strong)',
            background: 'var(--dash-surface-2)',
            color: 'var(--dash-text-tertiary)',
            cursor: 'pointer',
            flexShrink: 0,
            padding: 0,
            transition: 'background 0.15s ease',
          }}
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={13} strokeWidth={2} />
          </motion.div>
        </button>
      </div>

      {/* ── Command palette trigger (expanded only) ───────────────────────── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ padding: '10px 12px', borderBottom: '1px solid var(--dash-border)' }}
          >
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
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--dash-border-strong)',
                background: searchHovered ? 'var(--dash-surface-2)' : 'var(--dash-surface-1)',
                cursor: 'pointer',
                fontFamily: T.font,
                fontSize: '13px',
                color: 'var(--dash-text-tertiary)',
                transition: 'background 0.15s ease',
              }}
              aria-label="Abrir busqueda (Cmd+K)"
            >
              <Search size={13} strokeWidth={1.6} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'left' }}>Buscar...</span>
              <kbd
                style={{
                  fontSize: '10px',
                  color: 'var(--dash-text-tertiary)',
                  background: 'var(--dash-surface-2)',
                  border: '1px solid var(--dash-border)',
                  borderRadius: '5px',
                  padding: '1px 5px',
                  fontFamily: T.font,
                  lineHeight: 1.5,
                }}
              >
                K
              </kbd>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          padding: collapsed ? '10px 4px' : '10px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          let badge: number | undefined
          if (item.label === 'Leads' && badges.leads > 0)            badge = badges.leads
          if (item.label === 'Facturas' && badges.invoices > 0)      badge = badges.invoices
          // Note: "Entregas" is not a primary nav item label in NAV_ITEMS.
          // The deliverables badge is mapped here for future use when a
          // Deliverables nav item is added. Currently badge is unused.
          return (
            <NavLink
              key={item.href}
              item={item}
              active={active}
              accent={themeColors.accent}
              badge={badge}
              collapsed={collapsed}
              hoveredHref={hoveredHref}
              onHoverStart={setHoveredHref}
              onHoverEnd={() => setHoveredHref(null)}
            />
          )
        })}

        {/* Separator */}
        <div
          style={{
            height: '1px',
            background: 'var(--dash-border)',
            margin: '8px 4px',
          }}
        />

        {NAV_ITEMS_SECONDARY.map((item) => {
          const active = isActive(item.href)
          return (
            <NavLink
              key={item.href}
              item={item}
              active={active}
              accent={themeColors.accent}
              collapsed={collapsed}
              hoveredHref={hoveredHref}
              onHoverStart={setHoveredHref}
              onHoverEnd={() => setHoveredHref(null)}
            />
          )
        })}

        {/* ── Quick project switcher (expanded only) ───────────────────── */}
        {!collapsed && quickProjects.length > 0 && (
          <>
            <div
              style={{
                height: '1px',
                background: 'var(--dash-border)',
                margin: '8px 4px',
              }}
            />
            <div style={{ padding: '2px 0 4px' }}>
              <p
                style={{
                  fontFamily: T.font,
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--dash-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: '0 0 4px 10px',
                }}
              >
                Recientes
              </p>
              {quickProjects.map((proj, index) => (
                <QuickProjectLink
                  key={proj.id}
                  project={proj}
                  accent={themeColors.accent}
                  index={index}
                />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* ── User footer ──────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid var(--dash-border)',
          padding: collapsed ? '10px 4px 12px' : '10px 10px 12px',
        }}
      >
        {/* User info (expanded only) */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, delay: 0.3 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                marginBottom: '6px',
                borderRadius: '10px',
              }}
            >
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name ?? 'User avatar'}
                  width={36}
                  height={36}
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--dash-surface-3)',
                    border: '1px solid var(--dash-border-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: T.font,
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--dash-text-secondary)',
                      userSelect: 'none',
                    }}
                  >
                    {initials}
                  </span>
                </div>
              )}

              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontFamily: T.font,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--dash-text-primary)',
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
                    color: 'var(--dash-text-tertiary)',
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode toggle + Theme switcher (expanded only) */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 2px',
                marginBottom: '4px',
              }}
            >
              <button
                type="button"
                onClick={toggleMode}
                title={isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  border: '1px solid var(--dash-border-strong)',
                  background: 'var(--dash-surface-2)',
                  color: 'var(--dash-text-secondary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.15s ease',
                }}
              >
                {isLight
                  ? <Moon size={13} strokeWidth={1.8} />
                  : <Sun size={13} strokeWidth={1.8} />
                }
              </button>
              <div style={{ flex: 1 }}>
                <ThemeSwitcher />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logout button */}
        <button
          type="button"
          onClick={handleLogout}
          onMouseEnter={() => setLogoutHovered(true)}
          onMouseLeave={() => setLogoutHovered(false)}
          title={collapsed ? 'Cerrar sesion' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '8px',
            width: '100%',
            padding: collapsed ? '8px 0' : '8px 10px',
            borderRadius: T.radiusSm,
            border: 'none',
            background: logoutHovered ? 'rgba(255,69,58,0.1)' : 'transparent',
            color: logoutHovered ? T.accentRed : 'var(--dash-text-tertiary)',
            fontFamily: T.font,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'background 0.15s ease, color 0.15s ease',
            textAlign: 'left',
          }}
        >
          <LogOut size={14} strokeWidth={1.5} aria-hidden="true" style={{ flexShrink: 0 }} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                Cerrar sesion
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </aside>
  )
}
