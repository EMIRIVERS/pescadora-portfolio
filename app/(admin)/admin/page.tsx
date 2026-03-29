import { createClient } from '@/lib/supabase/server'

interface StatCard {
  label: string
  value: number | string
  description: string
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalProjects },
    { count: activeProjects },
    { count: pendingTasks },
    { count: totalClients },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'production'),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true }),
  ])

  const stats: StatCard[] = [
    {
      label: 'Proyectos totales',
      value: totalProjects ?? 0,
      description: 'Todos los proyectos registrados',
    },
    {
      label: 'En produccion',
      value: activeProjects ?? 0,
      description: 'Proyectos actualmente en produccion',
    },
    {
      label: 'Tareas pendientes',
      value: pendingTasks ?? 0,
      description: 'Tareas sin iniciar en el kanban',
    },
    {
      label: 'Clientes',
      value: totalClients ?? 0,
      description: 'Clientes registrados en la plataforma',
    },
  ]

  return (
    <div className="px-8 py-10 max-w-5xl">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-lg font-mono tracking-[0.15em] text-[#e8e8e8] uppercase">
          Dashboard
        </h1>
        <p className="mt-1 text-xs font-mono text-[#555] tracking-wide">
          Resumen general de la plataforma
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border border-[#1a1a1a] rounded-sm bg-[#0d0d0d] p-6"
          >
            <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#555] mb-3">
              {stat.label}
            </p>
            <p className="text-3xl font-mono text-[#e8e8e8] tabular-nums">
              {stat.value}
            </p>
            <p className="mt-2 text-[10px] font-mono text-[#3a3a3a] leading-relaxed">
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="mt-12 border-t border-[#1a1a1a]" />

      {/* Quick links */}
      <div className="mt-8">
        <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#444] mb-4">
          Accesos rapidos
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Ver proyectos', href: '/admin/projects' },
            { label: 'Kanban', href: '/admin/kanban' },
            { label: 'Clientes', href: '/admin/clients' },
            { label: 'Equipo', href: '/admin/team' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 border border-[#1a1a1a] rounded-sm text-[11px] font-mono text-[#666] hover:text-[#ccc] hover:border-[#333] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
