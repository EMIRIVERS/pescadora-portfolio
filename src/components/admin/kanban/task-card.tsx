'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'
import type { KanbanTaskWithAssignee, TaskPriority } from '@/lib/supabase/types'

// ── Priority badge ────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-zinc-700/60 text-zinc-400 ring-1 ring-zinc-600/40',
  medium: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  high: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: KanbanTaskWithAssignee
  onOpenDetail?: (taskId: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskCard({ task, onOpenDetail }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  function handleClick() {
    onOpenDetail?.(task.id)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpenDetail?.(task.id)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'group relative rounded-xl border bg-zinc-900 px-4 py-3 shadow-sm',
        'border-zinc-800 hover:border-zinc-700 transition-colors cursor-grab active:cursor-grabbing',
        isDragging ? 'ring-2 ring-zinc-500 shadow-xl z-50' : '',
      ].join(' ')}
      {...attributes}
      {...listeners}
    >
      {/* Click target — separated from drag listeners so click still fires */}
      <button
        type="button"
        className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        aria-label={`Open task: ${task.title}`}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      />

      <div className="relative pointer-events-none select-none">
        {/* Title */}
        <p className="text-sm font-medium text-zinc-100 leading-snug mb-2.5 pr-2">
          {task.title}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2">
          {/* Priority badge */}
          <span
            className={[
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
              PRIORITY_STYLES[task.priority],
            ].join(' ')}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>

          {/* Due date */}
          {task.due_date && (
            <span className="text-[11px] text-zinc-500">
              {new Date(task.due_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}

          {/* Assignee avatar */}
          {task.assignee && (
            <span className="ml-auto flex-shrink-0">
              {task.assignee.avatar_url ? (
                <Image
                  src={task.assignee.avatar_url}
                  alt={task.assignee.full_name ?? 'Assignee'}
                  width={24}
                  height={24}
                  className="rounded-full object-cover ring-1 ring-zinc-700"
                />
              ) : (
                <span
                  className="w-6 h-6 rounded-full bg-zinc-700 ring-1 ring-zinc-600 flex items-center justify-center text-[10px] font-semibold text-zinc-300"
                  aria-label={task.assignee.full_name ?? 'Assignee'}
                >
                  {(task.assignee.full_name ?? task.assignee.email ?? '?')
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
