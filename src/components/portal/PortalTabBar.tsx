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
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 flex border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[60px] transition-colors ${
              active ? 'text-sky-400' : 'text-zinc-300 active:bg-zinc-800/60'
            }`}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] font-medium">{label}</span>
          </a>
        )
      })}
    </nav>
  )
}
