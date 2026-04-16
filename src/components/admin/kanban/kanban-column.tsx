'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { KanbanBoardWithTasks } from '@/lib/supabase/types'
import { TaskCard } from './task-card'
import { useCreateTask } from '@/lib/queries/tasks'

// ── Props ─────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  board: KanbanBoardWithTasks
  projectId?: string
  onOpenTaskDetail?: (taskId: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KanbanColumn({ board, projectId, onOpenTaskDetail }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: board.id })

  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const createTask = useCreateTask(projectId)

  const taskIds = board.tasks.map((t) => t.id)

  async function handleAddTask() {
    const title = newTitle.trim()
    if (!title) {
      setIsAdding(false)
      return
    }
    setNewTitle('')
    setIsAdding(false)
    await createTask.mutateAsync({
      boardId: board.id,
      title,
      priority: 'medium',
      projectId,
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAddTask()
    if (e.key === 'Escape') {
      setNewTitle('')
      setIsAdding(false)
    }
  }

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{ width: '260px' }}
    >
      {/* Column container */}
      <div
        style={{
          backgroundColor: '#111111',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          transition: 'box-shadow 0.2s',
          boxShadow: isOver
            ? '0 0 0 2px rgba(0,113,227,0.5), 0 8px 32px rgba(0,0,0,0.5)'
            : '0 2px 12px rgba(0,0,0,0.4)',
        }}
      >
        {/* Column header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {board.color && (
              <span
                className="flex-shrink-0 rounded-full"
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: board.color,
                  boxShadow: `0 0 6px ${board.color}80`,
                }}
              />
            )}
            <h3
              className="truncate"
              style={{
                color: '#86868B',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {board.title}
            </h3>
          </div>

          {/* Task count badge */}
          <span
            className="flex-shrink-0 tabular-nums"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: '#48484A',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              padding: '1px 7px',
              minWidth: '22px',
              textAlign: 'center',
            }}
          >
            {board.tasks.length}
          </span>
        </div>

        {/* Drop zone + sortable list */}
        <div
          ref={setNodeRef}
          className="flex flex-col"
          style={{
            gap: '8px',
            padding: '10px 10px',
            minHeight: '80px',
            transition: 'background-color 0.15s',
            backgroundColor: isOver ? 'rgba(0,113,227,0.04)' : 'transparent',
          }}
        >
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {board.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpenDetail={onOpenTaskDetail}
              />
            ))}
          </SortableContext>

          {/* Inline add-task form */}
          {isAdding ? (
            <div style={{ padding: '2px 0' }}>
              <input
                autoFocus
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleAddTask}
                placeholder="Task title..."
                style={{
                  width: '100%',
                  backgroundColor: '#2C2C2E',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '13px',
                  color: '#F5F5F7',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 w-full transition-colors"
              style={{
                color: '#48484A',
                fontSize: '12px',
                fontWeight: 500,
                padding: '7px 8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.color = '#86868B'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#48484A'
              }}
            >
              <Plus size={13} aria-hidden="true" />
              Add task
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
