'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  KanbanBoardWithTasks,
  KanbanTaskWithAssignee,
  TaskActivityLog,
} from '@/lib/supabase/types'

// ── Query keys ────────────────────────────────────────────────────────────────

export const taskKeys = {
  all: ['tasks'] as const,
  boards: (projectId?: string) =>
    [...taskKeys.all, 'boards', projectId ?? 'all'] as const,
} as const

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchBoards(projectId?: string): Promise<KanbanBoardWithTasks[]> {
  const supabase = createClient()

  let boardsQuery = supabase
    .from('task_boards')
    .select('*')
    .order('position', { ascending: true })

  if (projectId) {
    boardsQuery = boardsQuery.eq('project_id', projectId)
  }

  const { data: boards, error: boardsError } = await boardsQuery

  if (boardsError) throw boardsError
  if (!boards || boards.length === 0) return []

  type RawBoard = { id: string; [key: string]: unknown }
  const typedBoards = (boards as unknown as RawBoard[])
  const boardIds = typedBoards.map((b) => b.id)

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*, assignee:profiles(*)')
    .in('board_id', boardIds)
    .order('position', { ascending: true })

  if (tasksError) throw tasksError

  type TaskWithBoardId = KanbanTaskWithAssignee & { board_id: string }
  const typedTasks = (tasks ?? []) as unknown as TaskWithBoardId[]

  // Group tasks by board_id
  const tasksByBoard = new Map<string, KanbanTaskWithAssignee[]>()
  for (const task of typedTasks) {
    const bucket = tasksByBoard.get(task.board_id) ?? []
    bucket.push(task)
    tasksByBoard.set(task.board_id, bucket)
  }

  return typedBoards.map((board) => ({
    ...(board as unknown as import('@/lib/supabase/types').KanbanBoard),
    tasks: tasksByBoard.get(board.id) ?? [],
  }))
}

// ── useTaskBoards ─────────────────────────────────────────────────────────────

export function useTaskBoards(projectId?: string) {
  return useQuery({
    queryKey: taskKeys.boards(projectId),
    queryFn: () => fetchBoards(projectId),
    staleTime: 30_000,
  })
}

// ── Move task payload ─────────────────────────────────────────────────────────

export interface MoveTaskPayload {
  taskId: string
  sourceBoardId: string
  destinationBoardId: string
  newPosition: number
  projectId?: string
}

async function logActivity(
  taskId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createClient()
  // fire-and-forget — failure must not break the mutation
  await supabase.from('task_activity_log').insert({
    task_id: taskId,
    action,
    new_value: JSON.stringify(payload),
  })
}

function applyMoveOptimistic(
  prev: KanbanBoardWithTasks[],
  variables: MoveTaskPayload
): KanbanBoardWithTasks[] {
  const { taskId, sourceBoardId, destinationBoardId, newPosition } = variables

  let movedTask: KanbanTaskWithAssignee | undefined

  const updated = prev.map((board) => {
    if (board.id === sourceBoardId) {
      const taskIndex = board.tasks.findIndex((t) => t.id === taskId)
      if (taskIndex === -1) return board
      movedTask = { ...board.tasks[taskIndex] }
      return {
        ...board,
        tasks: board.tasks.filter((t) => t.id !== taskId),
      }
    }
    return board
  })

  if (!movedTask) return prev

  const taskWithUpdates: KanbanTaskWithAssignee = {
    ...movedTask,
    board_id: destinationBoardId,
    position: newPosition,
  }

  return updated.map((board) => {
    if (board.id === destinationBoardId) {
      const tasks = [...board.tasks]
      const clampedPos = Math.min(Math.max(newPosition, 0), tasks.length)
      tasks.splice(clampedPos, 0, taskWithUpdates)
      return { ...board, tasks }
    }
    return board
  })
}

// ── useMoveTask ───────────────────────────────────────────────────────────────

export function useMoveTask(projectId?: string) {
  const queryClient: QueryClient = useQueryClient()
  const key = taskKeys.boards(projectId)

  return useMutation({
    mutationFn: async (variables: MoveTaskPayload) => {
      const supabase = createClient()

      const { error } = await supabase
        .from('tasks')
        .update({
          board_id: variables.destinationBoardId,
          position: variables.newPosition,
        })
        .eq('id', variables.taskId)

      if (error) throw error

      await logActivity(variables.taskId, 'moved', {
        from_board_id: variables.sourceBoardId,
        to_board_id: variables.destinationBoardId,
        new_position: variables.newPosition,
      })
    },

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: key })
      const snapshot = queryClient.getQueryData<KanbanBoardWithTasks[]>(key)

      queryClient.setQueryData<KanbanBoardWithTasks[]>(key, (prev) => {
        if (!prev) return prev
        return applyMoveOptimistic(prev, variables)
      })

      return { snapshot }
    },

    onError: (_err, _variables, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(key, context.snapshot)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

// ── Create task payload ───────────────────────────────────────────────────────

export interface CreateTaskPayload {
  boardId: string
  title: string
  priority: 'low' | 'medium' | 'high'
  projectId?: string
}

// ── useCreateTask ─────────────────────────────────────────────────────────────

export function useCreateTask(projectId?: string) {
  const queryClient: QueryClient = useQueryClient()
  const key = taskKeys.boards(projectId)

  return useMutation({
    mutationFn: async (variables: CreateTaskPayload): Promise<KanbanTaskWithAssignee> => {
      const supabase = createClient()

      // Determine next position in the target board
      const boards = queryClient.getQueryData<KanbanBoardWithTasks[]>(key)
      const board = boards?.find((b) => b.id === variables.boardId)
      const nextPosition = (board?.tasks.length ?? 0)

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          board_id: variables.boardId,
          title: variables.title,
          priority: variables.priority,
          position: nextPosition,
        })
        .select('*, assignee:profiles(*)')
        .single()

      if (error) throw error
      return data as unknown as KanbanTaskWithAssignee
    },

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: key })
      const snapshot = queryClient.getQueryData<KanbanBoardWithTasks[]>(key)

      // Optimistic placeholder
      const optimisticTask: KanbanTaskWithAssignee = {
        id: `optimistic-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        board_id: variables.boardId,
        title: variables.title,
        description: null,
        priority: variables.priority,
        assignee_id: null,
        due_date: null,
        position: 0,
        assignee: null,
      }

      queryClient.setQueryData<KanbanBoardWithTasks[]>(key, (prev) => {
        if (!prev) return prev
        return prev.map((board) => {
          if (board.id !== variables.boardId) return board
          return { ...board, tasks: [...board.tasks, optimisticTask] }
        })
      })

      return { snapshot }
    },

    onError: (_err, _variables, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(key, context.snapshot)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
