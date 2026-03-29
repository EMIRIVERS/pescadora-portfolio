import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ProjectStatus, ProjectWithClient } from '@/lib/supabase/types'

// ── Status badge config ───────────────────────────────────────────────────────

type BadgeConfig = {
  label: string
  classes: string
}

const STATUS_BADGE: Record<ProjectStatus, BadgeConfig> = {
  pre_production: {
    label: 'Pre-produccion',
    classes: 'bg-[#1c1c1c] text-[#888] border border-[#2a2a2a]',
  },
  production: {
    label: 'Produccion',
    classes: 'bg-[#0d1a2e] text-[#6fa3e0] border border-[#1a3050]',
  },
  post_production: {
    label: 'Post-produccion',
    classes: 'bg-[#1a0d2e] text-[#a87fdc] border border-[#2e1a50]',
  },
  delivered: {
    label: 'Entregado',
    classes: 'bg-[#0d1e15] text-[#5dbf8a] border border-[#1a3828]',
  },
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = STATUS_BADGE[status]
  return (
    <span
      className={[
        'inline-block px-2 py-0.5 rounded-sm text-[10px] font-mono tracking-wide',
        cfg.classes,
      ].join(' ')}
    >
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminProjectsPage() {
  const supabase = await createClient()

  const { data: projects, error } = await supabase
    .from('projects')
    .select(
      `
      id,
      title,
      description,
      status,
      client_id,
      start_date,
      end_date,
      created_at,
      updated_at,
      client:clients(
        id,
        name,
        email,
        company,
        avatar_url,
        profile_id,
        created_at,
        updated_at
      )
    `
    )
    .order('created_at', { ascending: false })

  const rows = (projects ?? []) as ProjectWithClient[]

  return (
    <div className="px-8 py-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-lg font-mono tracking-[0.15em] text-[#e8e8e8] uppercase">
            Proyectos
          </h1>
          <p className="mt-1 text-xs font-mono text-[#555] tracking-wide">
            {rows.length} proyecto{rows.length !== 1 ? 's' : ''} registrado
            {rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="px-4 py-2 bg-[#e8e8e8] hover:bg-white text-[#080808] text-[11px] font-mono tracking-[0.15em] uppercase rounded-sm transition-colors"
        >
          Nuevo proyecto
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-red-900/40 bg-red-950/20 rounded-sm">
          <p className="text-xs font-mono text-red-400/80">
            Error al cargar proyectos: {error.message}
          </p>
        </div>
      )}

      {rows.length === 0 && !error ? (
        <div className="py-20 text-center border border-[#1a1a1a] rounded-sm bg-[#0d0d0d]">
          <p className="text-xs font-mono text-[#444] tracking-wide">
            No hay proyectos todavia.
          </p>
        </div>
      ) : (
        <div className="border border-[#1a1a1a] rounded-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_180px_140px_110px_110px_32px] gap-4 px-5 py-3 border-b border-[#1a1a1a] bg-[#0d0d0d]">
            {['Proyecto', 'Cliente', 'Estado', 'Inicio', 'Entrega', ''].map(
              (col) => (
                <span
                  key={col}
                  className="text-[9px] font-mono tracking-[0.25em] uppercase text-[#444]"
                >
                  {col}
                </span>
              )
            )}
          </div>

          {/* Table rows */}
          <div className="divide-y divide-[#111]">
            {rows.map((project) => (
              <div
                key={project.id}
                className="grid grid-cols-[1fr_180px_140px_110px_110px_32px] gap-4 items-center px-5 py-4 hover:bg-[#0d0d0d] transition-colors"
              >
                {/* Title + description */}
                <div className="min-w-0">
                  <p className="text-sm font-mono text-[#ccc] truncate">
                    {project.title}
                  </p>
                  {project.description && (
                    <p className="mt-0.5 text-[11px] font-mono text-[#444] truncate">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Client */}
                <div className="min-w-0">
                  {project.client ? (
                    <p className="text-xs font-mono text-[#888] truncate">
                      {project.client.name}
                    </p>
                  ) : (
                    <span className="text-xs font-mono text-[#333]">—</span>
                  )}
                </div>

                {/* Status badge */}
                <div>
                  <StatusBadge status={project.status} />
                </div>

                {/* Start date */}
                <p className="text-[11px] font-mono text-[#555]">
                  {formatDate(project.start_date)}
                </p>

                {/* End date */}
                <p className="text-[11px] font-mono text-[#555]">
                  {formatDate(project.end_date)}
                </p>

                {/* Link arrow */}
                <Link
                  href={`/admin/projects/${project.id}`}
                  className="flex items-center justify-center w-7 h-7 rounded-sm text-[#333] hover:text-[#888] hover:bg-[#111] transition-colors"
                  aria-label={`Ver proyecto ${project.title}`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2 6h8M6 2l4 4-4 4" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
