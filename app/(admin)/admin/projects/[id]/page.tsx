import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type {
  ProjectWithClient,
  Deliverable,
  KanbanTask,
  ProjectStatus,
  DeliverableStatus,
} from '@/lib/supabase/types'
import { DeliverableList } from '@/components/admin/deliverables/deliverable-list'
import { ProjectAssignments } from '@/components/admin/projects/project-assignments'
import {
  Calendar,
  Columns,
  Pencil,
  ChevronLeft,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

type TypedProject = ProjectWithClient & {
  budget?: number | null
  currency?: string | null
  internal_notes?: string | null
}

const STATUS_STYLES: Record<ProjectStatus, { pill: string; dot: string }> = {
  pre_production: {
    pill: 'bg-[#48484A]/40 text-[#86868B] ring-1 ring-white/8',
    dot: 'bg-[#636366]',
  },
  production: {
    pill: 'bg-[#0071E3]/15 text-[#409CFF] ring-1 ring-[#0071E3]/30',
    dot: 'bg-[#0071E3]',
  },
  post_production: {
    pill: 'bg-[#BF5AF2]/15 text-[#BF5AF2] ring-1 ring-[#BF5AF2]/30',
    dot: 'bg-[#BF5AF2]',
  },
  delivered: {
    pill: 'bg-[#30D158]/15 text-[#30D158] ring-1 ring-[#30D158]/30',
    dot: 'bg-[#30D158]',
  },
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pre_production: 'Pre-produccion',
  production: 'Produccion',
  post_production: 'Post-produccion',
  delivered: 'Entregado',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatBudget(budget: number | null | undefined, currency: string | null | undefined): string {
  if (budget === null || budget === undefined) return '\u2014'
  const c = currency ?? 'MXN'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: c,
    maximumFractionDigits: 0,
  }).format(budget)
}

function countByStatus(deliverables: Deliverable[]): Record<DeliverableStatus, number> {
  const counts: Record<DeliverableStatus, number> = {
    pending: 0,
    review: 0,
    approved: 0,
  }
  for (const d of deliverables) {
    counts[d.status]++
  }
  return counts
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('*, client:clients(*)')
    .eq('id', id)
    .single()

  if (error || !project) {
    notFound()
  }

  const typedProject = project as unknown as TypedProject

  const [{ data: deliverables }, { data: tasks }] = await Promise.all([
    supabase
      .from('project_deliverables')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id, assignee_id')
      .eq('board_id', id),
  ])

  const safeDeliverables: Deliverable[] = (deliverables ?? []) as Deliverable[]
  const safeTasks: Pick<KanbanTask, 'id' | 'assignee_id'>[] =
    (tasks ?? []) as Pick<KanbanTask, 'id' | 'assignee_id'>[]

  const deliverableStatusCounts = countByStatus(safeDeliverables)
  const taskCount = safeTasks.length
  const uniqueAssignees = new Set(
    safeTasks.map((t) => t.assignee_id).filter(Boolean)
  ).size

  const statusStyle = STATUS_STYLES[typedProject.status]
  const statusLabel = STATUS_LABELS[typedProject.status]

  const statsCards = [
    {
      label: 'Cliente',
      value: typedProject.client?.name ?? (
        <span style={{ color: '#48484A' }}>Sin asignar</span>
      ),
      icon: null,
    },
    {
      label: 'Inicio',
      value: formatDate(typedProject.start_date),
      icon: <Calendar className="w-3.5 h-3.5" style={{ color: '#48484A' }} />,
    },
    {
      label: 'Cierre',
      value: formatDate(typedProject.end_date),
      icon: <Calendar className="w-3.5 h-3.5" style={{ color: '#48484A' }} />,
    },
    {
      label: 'Entregables',
      value: safeDeliverables.length,
      icon: null,
    },
    ...(typedProject.budget != null
      ? [
          {
            label: `Presupuesto (${typedProject.currency ?? 'MXN'})`,
            value: formatBudget(typedProject.budget, typedProject.currency),
            icon: null,
          },
        ]
      : []),
  ]

  return (
    <>
    <style>{`
      .proj-back-link { color: #86868B; transition: color 0.15s; }
      .proj-back-link:hover { color: #F5F5F7 !important; }
    `}</style>
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#111111',
        color: '#F5F5F7',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(17,17,17,0.85)',
        }}
      >
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <Link
            href="/admin/projects"
            className="proj-back-link flex items-center gap-1.5"
            style={{ fontSize: '14px' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Proyectos
          </Link>
          <Link
            href={`/admin/projects/${id}/edit`}
            className="flex items-center gap-2 transition-colors"
            style={{
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#0071E3',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '7px 14px',
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        {/* Project header */}
        <section className="space-y-5">
          <div className="flex items-start gap-4 flex-wrap">
            <h1
              className="flex-1 min-w-0"
              style={{ fontSize: '32px', fontWeight: 700, color: '#F5F5F7', letterSpacing: '-0.01em', lineHeight: 1.15 }}
            >
              {typedProject.title}
            </h1>
            <span
              className="mt-1 inline-flex items-center gap-1.5 flex-shrink-0"
              style={{
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '20px',
                padding: '4px 10px',
              }}
            >
              <span
                className={[statusStyle.pill, 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium'].join(' ')}
              >
                <span
                  className={[statusStyle.dot, 'w-1.5 h-1.5 rounded-full flex-shrink-0'].join(' ')}
                />
                {statusLabel}
              </span>
            </span>
          </div>

          {typedProject.description && (
            <p
              className="max-w-2xl leading-relaxed"
              style={{ fontSize: '15px', color: '#86868B' }}
            >
              {typedProject.description}
            </p>
          )}

          {/* Stats cards */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statsCards.map((card) => (
              <div
                key={card.label}
                style={{
                  backgroundColor: '#1C1C1E',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                }}
              >
                <dt
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#48484A',
                    marginBottom: '6px',
                  }}
                >
                  {card.label}
                </dt>
                <dd
                  className="flex items-center gap-1.5"
                  style={{ fontSize: '14px', fontWeight: 500, color: '#F5F5F7' }}
                >
                  {card.icon}
                  {card.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Deliverables section */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#F5F5F7' }}>
              Entregables
            </h2>
            <div className="flex items-center gap-4" style={{ fontSize: '12px', color: '#48484A' }}>
              <span>
                <span style={{ color: '#86868B', fontWeight: 500 }}>{deliverableStatusCounts.pending}</span>
                {' '}pendientes
              </span>
              <span>
                <span style={{ color: '#86868B', fontWeight: 500 }}>{deliverableStatusCounts.review}</span>
                {' '}en revision
              </span>
              <span>
                <span style={{ color: '#30D158', fontWeight: 500 }}>{deliverableStatusCounts.approved}</span>
                {' '}aprobados
              </span>
            </div>
          </div>
          <DeliverableList projectId={id} initialDeliverables={safeDeliverables} />
        </section>

        {/* Notas internas */}
        {typedProject.internal_notes && (
          <section className="space-y-4">
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#F5F5F7' }}>
              Notas internas
            </h2>
            <div
              style={{
                backgroundColor: '#1C1C1E',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '20px 24px',
                fontSize: '14px',
                color: '#86868B',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {typedProject.internal_notes}
            </div>
          </section>
        )}

        {/* Team section */}
        <section className="space-y-5">
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#F5F5F7' }}>
            Equipo
          </h2>
          <ProjectAssignments projectId={id} />
        </section>

        {/* Kanban tasks */}
        <section className="space-y-5">
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#F5F5F7' }}>
            Tareas Kanban
          </h2>
          <div
            className="flex items-center justify-between"
            style={{
              backgroundColor: '#1C1C1E',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '20px 24px',
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex items-center justify-center"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#2C2C2E',
                }}
              >
                <Columns className="w-4 h-4" style={{ color: '#86868B' }} />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#F5F5F7' }}>
                  {taskCount === 0
                    ? 'Sin tareas vinculadas'
                    : `${taskCount} tarea${taskCount !== 1 ? 's' : ''} en total`}
                </p>
                <p style={{ fontSize: '12px', color: '#48484A', marginTop: '2px' }}>
                  {uniqueAssignees} asignado{uniqueAssignees !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Link
              href={`/admin/kanban?project=${id}`}
              className="transition-colors"
              style={{ fontSize: '13px', color: '#0071E3', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Ver tablero
            </Link>
          </div>
        </section>
      </div>
    </div>
    </>
  )
}
