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
import {
  Calendar,
  Users,
  Columns,
  Pencil,
  ChevronLeft,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  pre_production: 'bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-500/30',
  production: 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30',
  post_production: 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pre_production: 'Pre-producción',
  production: 'Producción',
  post_production: 'Post-producción',
  delivered: 'Entregado',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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

  const typedProject = project as unknown as ProjectWithClient

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <Link
            href="/admin/projects"
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Projects
          </Link>
          <Link
            href={`/admin/projects/${id}/edit`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit project
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        {/* Project header */}
        <section className="space-y-4">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 flex-1 min-w-0">
              {typedProject.title}
            </h1>
            <span
              className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}
            >
              {statusLabel}
            </span>
          </div>

          {typedProject.description && (
            <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
              {typedProject.description}
            </p>
          )}

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 space-y-0.5">
              <dt className="text-xs text-zinc-500 uppercase tracking-widest">Client</dt>
              <dd className="text-sm font-medium text-zinc-100">
                {typedProject.client?.name ?? (
                  <span className="text-zinc-600">Unassigned</span>
                )}
              </dd>
            </div>
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 space-y-0.5">
              <dt className="text-xs text-zinc-500 uppercase tracking-widest">Start</dt>
              <dd className="text-sm font-medium text-zinc-100 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {formatDate(typedProject.start_date)}
              </dd>
            </div>
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 space-y-0.5">
              <dt className="text-xs text-zinc-500 uppercase tracking-widest">End</dt>
              <dd className="text-sm font-medium text-zinc-100 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {formatDate(typedProject.end_date)}
              </dd>
            </div>
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 space-y-0.5">
              <dt className="text-xs text-zinc-500 uppercase tracking-widest">Deliverables</dt>
              <dd className="text-sm font-medium text-zinc-100">
                {safeDeliverables.length}
              </dd>
            </div>
          </dl>
        </section>

        {/* Deliverables section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-50">Deliverables</h2>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span>{deliverableStatusCounts.pending} pending</span>
              <span>{deliverableStatusCounts.review} in review</span>
              <span>{deliverableStatusCounts.approved} approved</span>
            </div>
          </div>
          <DeliverableList projectId={id} initialDeliverables={safeDeliverables} />
        </section>

        {/* Team section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-50">Team</h2>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-6 py-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
              <Users className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">
                {uniqueAssignees === 0
                  ? 'No assignees yet'
                  : `${uniqueAssignees} team member${uniqueAssignees !== 1 ? 's' : ''} assigned`}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Assignees are managed through Kanban tasks
              </p>
            </div>
          </div>
        </section>

        {/* Kanban tasks count */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-50">Kanban tasks</h2>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <Columns className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  {taskCount === 0
                    ? 'No tasks linked to this project'
                    : `${taskCount} task${taskCount !== 1 ? 's' : ''} total`}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {uniqueAssignees} asignado{uniqueAssignees !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Link
              href={`/admin/kanban?project=${id}`}
              className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors underline underline-offset-2"
            >
              View board
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
