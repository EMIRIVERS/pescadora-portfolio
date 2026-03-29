'use client'

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { KanbanBoardWithTasks, KanbanTaskWithAssignee } from '@/lib/supabase/types'
import { KanbanColumn } from './kanban-column'
import { TaskCard } from './task-card'
import { useTaskBoards, useMoveTask, taskKeys } from '@/lib/queries/tasks'

// ── Props ─────────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  projectId?: string
  initialBoards: KanbanBoardWithTasks[]
}

// ── Task detail modal placeholder ─────────────────────────────────────────────

function TaskDetailModal({
  taskId,
  onClose,
}: {
  taskId: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Task detail"
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs text-zinc-500 mb-1 uppercase tracking-widest">Task ID</p>
        <p className="font-mono text-zinc-200 text-sm break-all mb-6">{taskId}</p>
        <p className="text-zinc-400 text-sm">
          Task detail panel — wire up full form here.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── KanbanBoard ───────────────────────────────────────────────────────────────

export function KanbanBoard({ projectId, initialBoards }: KanbanBoardProps) {
  const queryClient = useQueryClient()

  // Hydrate cache with SSR data on first render
  if (!queryClient.getQueryData(taskKeys.boards(projectId))) {
    queryClient.setQueryData(taskKeys.boards(projectId), initialBoards)
  }

  const { data: boards = initialBoards } = useTaskBoards(projectId)
  const moveTask = useMoveTask(projectId)

  const [activeTask, setActiveTask] = useState<KanbanTaskWithAssignee | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Locate a task across all boards
  const findTask = useCallback(
    (taskId: string): KanbanTaskWithAssignee | undefined => {
      for (const board of boards) {
        const found = board.tasks.find((t) => t.id === taskId)
        if (found) return found
      }
      return undefined
    },
    [boards]
  )

  // Locate which board a task belongs to
  const findBoardIdForTask = useCallback(
    (taskId: string): string | undefined => {
      return boards.find((b) => b.tasks.some((t) => t.id === taskId))?.id
    },
    [boards]
  )

  function handleDragStart({ active }: DragStartEvent) {
    const task = findTask(active.id as string)
    setActiveTask(task ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null)

    if (!over) return

    const draggedId = active.id as string
    const overId = over.id as string

    const sourceBoardId = findBoardIdForTask(draggedId)
    if (!sourceBoardId) return

    // Determine destination: over can be a column (board id) or a task id
    const destinationBoard = boards.find((b) => b.id === overId)
    let destinationBoardId: string
    let newPosition: number

    if (destinationBoard) {
      // Dropped directly onto a column
      destinationBoardId = destinationBoard.id
      newPosition = destinationBoard.tasks.length
    } else {
      // Dropped onto another task — find the board and position of that task
      const targetBoardId = findBoardIdForTask(overId)
      if (!targetBoardId) return
      destinationBoardId = targetBoardId

      const targetBoard = boards.find((b) => b.id === targetBoardId)
      if (!targetBoard) return
      const targetIndex = targetBoard.tasks.findIndex((t) => t.id === overId)
      newPosition = targetIndex === -1 ? targetBoard.tasks.length : targetIndex
    }

    // No-op: same position in same board
    if (sourceBoardId === destinationBoardId) {
      const srcBoard = boards.find((b) => b.id === sourceBoardId)
      const currentIndex = srcBoard?.tasks.findIndex((t) => t.id === draggedId) ?? -1
      if (currentIndex === newPosition) return
    }

    moveTask.mutate({
      taskId: draggedId,
      sourceBoardId,
      destinationBoardId,
      newPosition,
      projectId,
    })
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 items-start overflow-x-auto pb-6 min-h-[60vh]">
          {boards.map((board) => (
            <KanbanColumn
              key={board.id}
              board={board}
              projectId={projectId}
              onOpenTaskDetail={(id) => setOpenTaskId(id)}
            />
          ))}

          {boards.length === 0 && (
            <div className="flex items-center justify-center w-full py-24 text-zinc-500 text-sm">
              No boards found for this project.
            </div>
          )}
        </div>

        {/* Drag overlay — renders a ghost card while dragging */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-1 scale-105">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task detail modal */}
      {openTaskId && (
        <TaskDetailModal
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </>
  )
}
