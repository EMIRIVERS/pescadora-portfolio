'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Check, X } from 'lucide-react'
import { useState, useRef } from 'react'
import type { KanbanBoardWithTasks, TaskPriority } from '@/lib/supabase/types'
import { TaskCard } from './task-card'
import { useCreateTask } from '@/lib/queries/tasks'

// ── Shared field style ─────────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#1C1C1E',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '7px 10px',
  fontSize: '12px',
  color: '#F5F5F7',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  colorScheme: 'dark',
}

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
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [newDueDate, setNewDueDate] = useState('')

  const titleRef = useRef<HTMLInputElement>(null)

  const createTask = useCreateTask(projectId)

  const taskIds = board.tasks.map((t) => t.id)

  async function handleAddTask() {
    const title = newTitle.trim()
    if (!title) {
      cancelAdding()
      return
    }
    setIsAdding(false)
    setNewTitle('')
    setNewPriority('medium')
    setNewDueDate('')
    await createTask.mutateAsync({
      boardId: board.id,
      title,
      priority: newPriority,
      due_date: newDueDate || null,
      projectId,
    })
  }

  function cancelAdding() {
    setNewTitle('')
    setNewPriority('medium')
    setNewDueDate('')
    setIsAdding(false)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAddTask()
    if (e.key === 'Escape') cancelAdding()
  }

  function openAdding() {
    setIsAdding(true)
    // focus title on next frame
    requestAnimationFrame(() => titleRef.current?.focus())
  }

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{ width: '240px' }}
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
        {/* Column header — slightly different background */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '11px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backgroundColor: 'rgba(255,255,255,0.025)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {board.color && (
              <span
                className="flex-shrink-0 rounded-full"
                style={{
                  width: '7px',
                  height: '7px',
                  backgroundColor: board.color,
                  boxShadow: `0 0 5px ${board.color}80`,
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
              padding: '1px 6px',
              minWidth: '20px',
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
            gap: '6px',
            padding: '8px 8px',
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
            <div
              style={{
                backgroundColor: '#1C1C1E',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '7px',
              }}
            >
              {/* Title input */}
              <input
                ref={titleRef}
                autoFocus
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                placeholder="Titulo de la tarea..."
                style={fieldStyle}
              />

              {/* Priority select */}
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                style={{ ...fieldStyle, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="low">Baja</option>
                <option value="medium">Normal</option>
                <option value="high">Alta</option>
              </select>

              {/* Due date */}
              <input
                type="date"
                name="due_date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                style={fieldStyle}
              />

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="flex items-center justify-center gap-1 flex-1 transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: '#0071E3',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Check size={12} aria-hidden="true" />
                  Agregar
                </button>
                <button
                  type="button"
                  onClick={cancelAdding}
                  className="flex items-center justify-center transition-opacity hover:opacity-80"
                  aria-label="Cancelar"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: '#86868B',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '7px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAdding}
              className="flex items-center gap-1.5 w-full transition-colors"
              style={{
                color: '#48484A',
                fontSize: '12px',
                fontWeight: 500,
                padding: '6px 8px',
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
              <Plus size={12} aria-hidden="true" />
              Agregar tarea
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
