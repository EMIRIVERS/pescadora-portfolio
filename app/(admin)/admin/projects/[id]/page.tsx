import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type {
  ProjectWithClient,
  Deliverable,
  KanbanTask,
  DeliverableStatus,
} from '@/lib/supabase/types'
import { DeliverableList } from '@/components/admin/deliverables/deliverable-list'
import { ProjectAssignments } from '@/components/admin/projects/project-assignments'
import { StatusChanger } from '@/components/admin/projects/StatusChanger'
import { InternalNotesEditor } from '@/components/admin/projects/InternalNotesEditor'
import { ProjectComments } from '@/components/admin/projects/ProjectComments'
import { getProjectComments } from '@/lib/actions/projects'
import { getExpenses } from '@/lib/actions/expenses'
import { BudgetTracker } from '@/components/admin/projects/BudgetTracker'
import type { ProjectExpense } from '@/lib/supabase/types'
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: deliverables }, { data: tasks }, comments, initialExpenses] = await Promise.all([
    supabase
      .from('project_deliverables')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id, assignee_id')
      .eq('board_id', id),
    getProjectComments(id),
    getExpenses(id),
  ])
  const safeExpenses: ProjectExpense[] = initialExpenses as ProjectExpense[]

  const safeDeliverables: Deliverable[] = (deliverables ?? []) as Deliverable[]
  const safeTasks: Pick<KanbanTask, 'id' | 'assignee_id'>[] =
    (tasks ?? []) as Pick<KanbanTask, 'id' | 'assignee_id'>[]

  const taskIds = safeTasks.map((t) => t.id)
  const { data: activityLog } = taskIds.length > 0
    ? await supabase
        .from('task_activity_log')
        .select('id, action, created_at')
        .in('task_id', taskIds)
        .ilike('action', '%status%')
        .order('created_at', { ascending: false })
        .limit(10)
    : { data: [] }
  const safeActivityLog = (activityLog ?? []) as { id: string; action: string; created_at: string }[]

  const deliverableStatusCounts = countByStatus(safeDeliverables)
  const taskCount = safeTasks.length
  const uniqueAssignees = new Set(
    safeTasks.map((t) => t.assignee_id).filter(Boolean)
  ).size

  async function createDeliverable(fd: FormData) {
    'use server'
    const sc = createServiceClient()
    const title = fd.get('title') as string
    const url = (fd.get('url') as string) || null
    await sc.from('project_deliverables').insert({
      project_id: id,
      title,
      url,
      status: 'pending',
    })
    revalidatePath(`/admin/projects/${id}`)
  }

  const statsCards = [
    {
      label: 'Cliente',
      value: typedProject.client ? (
        <Link
          href={`/admin/clients/${typedProject.client.id}`}
          style={{ color: '#0071E3', textDecoration: 'none', fontWeight: 500 }}
        >
          {typedProject.client.name}
        </Link>
      ) : (
        <span style={{ color: 'var(--dash-text-tertiary)' }}>Sin asignar</span>
      ),
      icon: null,
    },
    {
      label: 'Inicio',
      value: formatDate(typedProject.start_date),
      icon: <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--dash-text-tertiary)' }} />,
    },
    {
      label: 'Cierre',
      value: formatDate(typedProject.end_date),
      icon: <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--dash-text-tertiary)' }} />,
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
      .proj-back-link { color: var(--dash-text-secondary); transition: color 0.15s; }
      .proj-back-link:hover { color: var(--dash-text-primary) !important; }
    `}</style>
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--dash-surface-1)',
        color: 'var(--dash-text-primary)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          borderBottom: '1px solid var(--dash-border)',
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
              style={{ fontSize: '32px', fontWeight: 700, color: 'var(--dash-text-primary)', letterSpacing: '-0.01em', lineHeight: 1.15 }}
            >
              {typedProject.title}
            </h1>
            <div className="mt-1 flex-shrink-0">
              <StatusChanger projectId={id} currentStatus={typedProject.status} />
            </div>
          </div>

          {typedProject.description && (
            <p
              className="max-w-2xl leading-relaxed"
              style={{ fontSize: '15px', color: 'var(--dash-text-secondary)' }}
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
                  backgroundColor: 'var(--dash-surface-2)',
                  border: '1px solid var(--dash-border)',
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
                    color: 'var(--dash-text-tertiary)',
                    marginBottom: '6px',
                  }}
                >
                  {card.label}
                </dt>
                <dd
                  className="flex items-center gap-1.5"
                  style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dash-text-primary)' }}
                >
                  {card.icon}
                  {card.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Historial de estados */}
        <section className="space-y-4">
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--dash-text-primary)' }}>
            Historial
          </h2>
          <div
            style={{
              backgroundColor: 'var(--dash-surface-2)',
              border: '1px solid var(--dash-border)',
              borderRadius: '16px',
              padding: '20px 24px',
            }}
          >
            {safeActivityLog.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--dash-text-tertiary)' }}>Sin historial de cambios.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {safeActivityLog.map((entry) => (
                  <li key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: '#0071E3',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--dash-text-primary)', flex: 1 }}>{entry.action}</span>
                    <span style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(entry.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Deliverables section */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--dash-text-primary)' }}>
              Entregables
            </h2>
            <div className="flex items-center gap-4" style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)' }}>
              <span>
                <span style={{ color: 'var(--dash-text-secondary)', fontWeight: 500 }}>{deliverableStatusCounts.pending}</span>
                {' '}pendientes
              </span>
              <span>
                <span style={{ color: 'var(--dash-text-secondary)', fontWeight: 500 }}>{deliverableStatusCounts.review}</span>
                {' '}en revision
              </span>
              <span>
                <span style={{ color: '#30D158', fontWeight: 500 }}>{deliverableStatusCounts.approved}</span>
                {' '}aprobados
              </span>
            </div>
          </div>
          {/* Inline add-deliverable form */}
          <form
            action={createDeliverable}
            style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}
          >
            <input
              name="title"
              required
              placeholder="Título del entregable"
              style={{
                flex: '1 1 160px',
                backgroundColor: 'var(--dash-surface-2)',
                border: '1px solid var(--dash-border)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--dash-text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <input
              name="url"
              placeholder="URL opcional"
              style={{
                flex: '1 1 160px',
                backgroundColor: 'var(--dash-surface-2)',
                border: '1px solid var(--dash-border)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--dash-text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: '#0071E3',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + Agregar
            </button>
          </form>
          <DeliverableList projectId={id} initialDeliverables={safeDeliverables} />
        </section>

        {/* Presupuesto y gastos */}
        <BudgetTracker
          projectId={id}
          budget={typedProject.budget}
          currency={typedProject.currency}
          initialExpenses={safeExpenses}
        />

        {/* Notas internas — editable */}
        <InternalNotesEditor
          projectId={id}
          initialNotes={typedProject.internal_notes}
        />

        {/* Comentarios internos */}
        <ProjectComments
          projectId={id}
          initialComments={comments}
          currentUserId={user?.id ?? ''}
        />

        {/* Team section */}
        <section className="space-y-5">
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--dash-text-primary)' }}>
            Equipo
          </h2>
          <ProjectAssignments projectId={id} />
        </section>

        {/* Kanban tasks */}
        <section className="space-y-5">
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--dash-text-primary)' }}>
            Tareas Kanban
          </h2>
          <div
            className="flex items-center justify-between"
            style={{
              backgroundColor: 'var(--dash-surface-2)',
              border: '1px solid var(--dash-border)',
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
                  backgroundColor: 'var(--dash-surface-3)',
                }}
              >
                <Columns className="w-4 h-4" style={{ color: 'var(--dash-text-secondary)' }} />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dash-text-primary)' }}>
                  {taskCount === 0
                    ? 'Sin tareas vinculadas'
                    : `${taskCount} tarea${taskCount !== 1 ? 's' : ''} en total`}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', marginTop: '2px' }}>
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
