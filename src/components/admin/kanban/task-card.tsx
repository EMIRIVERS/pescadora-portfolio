'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'
import { motion } from 'framer-motion'
import type { KanbanTaskWithAssignee, TaskPriority } from '@/lib/supabase/types'

// ── Priority config ────────────────────────────────────────────────────────────

// Left-border color by priority (3 px solid strip)
const PRIORITY_BORDER_COLOR: Record<TaskPriority, string> = {
  low:    'var(--dash-border)',
  medium: 'var(--dash-warning)',
  high:   'var(--dash-danger)',
}

// Small dot color shown next to the label
const PRIORITY_DOT_COLOR: Record<TaskPriority, string> = {
  low:    'var(--dash-text-tertiary)',
  medium: 'var(--dash-warning)',
  high:   'var(--dash-danger)',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low:    'Normal',
  medium: 'Alta',
  high:   'Urgente',
}

// Only show badge for medium and high
const PRIORITY_BADGE: Partial<Record<TaskPriority, { label: string; color: string; bg: string }>> = {
  medium: { label: 'Alta',    color: 'var(--dash-warning)', bg: 'color-mix(in srgb, var(--dash-warning) 12%, transparent)' },
  high:   { label: 'Urgente', color: 'var(--dash-danger)',  bg: 'color-mix(in srgb, var(--dash-danger) 12%, transparent)'  },
}

// ── Due-date color helper ──────────────────────────────────────────────────────

function getDueDateColor(due: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(`${due}T00:00:00`)
  const diff = dueDate.getTime() - today.getTime()
  const dayMs = 86_400_000
  if (diff < 0) return 'var(--dash-danger)'
  if (diff <= 2 * dayMs) return 'var(--dash-warning)'
  return 'var(--dash-success)'
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
    opacity: isDragging ? 0.3 : 1,
    // Card base styles (applied here to allow isDragging override)
    backgroundColor: isDragging ? 'var(--dash-surface-3)' : 'var(--dash-surface-2)',
    borderRadius: '12px',
    border: '1px solid var(--dash-border)',
    borderLeft: `3px solid ${PRIORITY_BORDER_COLOR[task.priority]}`,
    padding: '14px 16px',
    cursor: 'grab',
    position: 'relative',
    boxShadow: isDragging
      ? 'var(--dash-shadow-xl)'
      : 'var(--dash-shadow-sm), var(--dash-highlight)',
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
    <motion.div
      ref={setNodeRef}
      style={style}
      whileHover={
        isDragging
          ? undefined
          : { y: -2 }
      }
      whileTap={isDragging ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.12 }}
      {...attributes}
      {...listeners}
    >
      {/* Invisible click target — separated from drag listeners so click still fires */}
      <button
        type="button"
        className="absolute inset-0 rounded-xl focus:outline-none"
        style={{ borderRadius: '12px' }}
        aria-label={`Open task: ${task.title}`}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      />

      <div style={{ position: 'relative', pointerEvents: 'none', userSelect: 'none' }}>
        {/* Title */}
        <p
          style={{
            color: 'var(--dash-text-primary)',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '1.35',
            marginBottom: '10px',
            paddingRight: '4px',
            letterSpacing: '-0.01em',
          }}
        >
          {task.title}
        </p>

        {/* Description (2 lines max) */}
        {task.description && (
          <p
            style={{
              color: 'var(--dash-text-secondary)',
              fontSize: '12px',
              lineHeight: '1.45',
              marginBottom: '10px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {task.description}
          </p>
        )}

        {/* Footer row */}
        <div
          className="flex items-center gap-2"
          style={{ justifyContent: 'space-between', flexWrap: 'wrap', rowGap: '6px' }}
        >
          {/* Priority indicator + badge */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="rounded-full flex-shrink-0"
              style={{
                width: '6px',
                height: '6px',
                backgroundColor: PRIORITY_DOT_COLOR[task.priority],
              }}
              aria-hidden="true"
            />
            <span
              style={{
                color: 'var(--dash-text-tertiary)',
                fontSize: '11px',
                fontWeight: 500,
              }}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
            {PRIORITY_BADGE[task.priority] && (
              <span
                style={{
                  backgroundColor: PRIORITY_BADGE[task.priority]!.bg,
                  color: PRIORITY_BADGE[task.priority]!.color,
                  fontSize: '10px',
                  fontWeight: 600,
                  borderRadius: '5px',
                  padding: '1px 5px',
                  letterSpacing: '0.01em',
                  flexShrink: 0,
                }}
              >
                {PRIORITY_BADGE[task.priority]!.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Due date — colored by urgency */}
            {task.due_date && (
              <span
                style={{
                  color: getDueDateColor(task.due_date),
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  flexShrink: 0,
                }}
              >
                {new Date(`${task.due_date}T00:00:00`).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            )}

            {/* Assignee avatar */}
            {task.assignee && (
              <span className="flex-shrink-0">
                {task.assignee.avatar_url ? (
                  <Image
                    src={task.assignee.avatar_url}
                    alt={task.assignee.full_name ?? 'Assignee'}
                    width={24}
                    height={24}
                    className="rounded-full object-cover"
                    style={{
                      width: '24px',
                      height: '24px',
                      border: '1.5px solid var(--dash-border)',
                    }}
                  />
                ) : (
                  <span
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    aria-label={task.assignee.full_name ?? 'Assignee'}
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: 'var(--dash-surface-3)',
                      border: '1.5px solid var(--dash-border)',
                      color: 'var(--dash-text-secondary)',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}
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
    </motion.div>
  )
}
