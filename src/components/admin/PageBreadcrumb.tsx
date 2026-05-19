'use client'

import { usePathname } from 'next/navigation'

const ROUTE_LABELS: Record<string, string> = {
  '/admin':                  'Dashboard',
  '/admin/portfolio':        'Portfolio',
  '/admin/media':            'Media',
  '/admin/projects':         'Proyectos',
  '/admin/kanban':           'Tareas',
  '/admin/calendar':         'Calendario',
  '/admin/clients':          'Clientes',
  '/admin/invoices':         'Facturas',
  '/admin/proposals':        'Propuestas',
  '/admin/leads':            'Leads',
  '/admin/team':             'Equipo',
  '/admin/automatizaciones': 'Automatizaciones',
  '/admin/buscar':           'Buscar',
  '/admin/reportes':         'Reportes',
  '/admin/actividad':        'Actividad',
}

function getLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  // Dynamic routes: /admin/projects/[id], /admin/clients/[id], etc.
  for (const [route, label] of Object.entries(ROUTE_LABELS)) {
    if (pathname.startsWith(route + '/')) return label
  }
  return 'Admin'
}

export default function PageBreadcrumb() {
  const pathname = usePathname()
  const label = getLabel(pathname)
  const isSubPage = pathname.split('/').length > 3 && pathname !== '/admin'

  return (
    <span
      style={{
        fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        fontSize: 13,
        fontWeight: 500,
        color: isSubPage ? 'var(--dash-text-secondary)' : 'var(--dash-text-primary)',
        letterSpacing: isSubPage ? 0 : '-0.01em',
      }}
    >
      {label}
    </span>
  )
}
