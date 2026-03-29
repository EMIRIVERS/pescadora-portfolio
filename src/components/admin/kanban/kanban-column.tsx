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
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {board.color && (
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: board.color }}
            />
          )}
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
            {board.title}
          </h3>
          <span className="ml-1 text-xs font-medium text-zinc-500 tabular-nums">
            {board.tasks.length}
          </span>
        </div>
      </div>

      {/* Drop zone + sortable list */}
      <div
        ref={setNodeRef}
        className={[
          'flex flex-col gap-2.5 rounded-xl p-2 min-h-[4rem] flex-1 transition-colors',
          isOver
            ? 'bg-zinc-800/60 ring-1 ring-zinc-600/50'
            : 'bg-zinc-900/40',
        ].join(' ')}
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
          <div className="flex flex-col gap-1.5">
            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleAddTask}
              placeholder="Task title…"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 mt-0.5 px-2 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/70 transition-colors w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add task
          </button>
        )}
      </div>
    </div>
  )
}
