'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'
import type { KanbanTaskWithAssignee, TaskPriority } from '@/lib/supabase/types'

// ── Priority config ────────────────────────────────────────────────────────────

// Left-border color by priority (3 px solid strip)
const PRIORITY_BORDER_COLOR: Record<TaskPriority, string> = {
  low: '#3A3A3C',
  medium: '#FF9F0A',
  high: '#FF453A',
}

// Small dot color shown next to the label
const PRIORITY_DOT_COLOR: Record<TaskPriority, string> = {
  low: '#48484A',
  medium: '#FF9F0A',
  high: '#FF453A',
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
    opacity: isDragging ? 0.3 : 1,
    // Card base styles (applied here to allow isDragging override)
    backgroundColor: isDragging ? '#2C2C2E' : '#1C1C1E',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
    borderLeft: `3px solid ${PRIORITY_BORDER_COLOR[task.priority]}`,
    padding: '14px 16px',
    cursor: 'grab',
    position: 'relative',
    boxShadow: isDragging
      ? '0 16px 48px rgba(0,0,0,0.8)'
      : '0 1px 4px rgba(0,0,0,0.4)',
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
      {...attributes}
      {...listeners}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = '#2C2C2E'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
          e.currentTarget.style.borderLeft = `3px solid ${PRIORITY_BORDER_COLOR[task.priority]}`
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = '#1C1C1E'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
          e.currentTarget.style.borderLeft = `3px solid ${PRIORITY_BORDER_COLOR[task.priority]}`
        }
      }}
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
            color: '#F5F5F7',
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
              color: '#86868B',
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
          style={{ justifyContent: 'space-between' }}
        >
          {/* Priority indicator */}
          <div className="flex items-center gap-1.5">
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
                color: '#48484A',
                fontSize: '11px',
                fontWeight: 500,
              }}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Due date */}
            {task.due_date && (
              <span
                style={{
                  color: '#48484A',
                  fontSize: '11px',
                  fontWeight: 400,
                  letterSpacing: '0.01em',
                }}
              >
                {new Date(task.due_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
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
                      border: '1.5px solid rgba(255,255,255,0.1)',
                    }}
                  />
                ) : (
                  <span
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    aria-label={task.assignee.full_name ?? 'Assignee'}
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#2C2C2E',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                      color: '#86868B',
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
    </div>
  )
}
