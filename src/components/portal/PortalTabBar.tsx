'use client'

import { usePathname } from 'next/navigation'
import { FolderKanban, FileText, FolderOpen, CalendarDays, TrendingUp } from 'lucide-react'

const TABS = [
  { href: '/portal', label: 'Proyectos', Icon: FolderKanban, exact: true },
  { href: '/portal/calendario', label: 'Calendario', Icon: CalendarDays, exact: false },
  { href: '/portal/rendimiento', label: 'Rendimiento', Icon: TrendingUp, exact: false },
  { href: '/portal/invoices', label: 'Facturas', Icon: FileText, exact: false },
  { href: '/portal/archivos', label: 'Archivos', Icon: FolderOpen, exact: false },
] as const

/**
 * Mobile bottom tab bar for the client portal. The desktop nav is hidden under
 * `sm`, so on phones this is the only way to reach Facturas / Archivos.
 * Highlights the active route and respects the iOS home-indicator safe area.
 */
export default function PortalTabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 flex border-t backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', borderColor: 'rgba(237,232,224,0.1)', background: 'rgba(5,5,5,0.95)' }}
    >
      {TABS.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[60px] transition-colors"
            style={{ color: active ? '#e8341a' : '#8a857d' }}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] font-medium">{label}</span>
          </a>
        )
      })}
    </nav>
  )
}
