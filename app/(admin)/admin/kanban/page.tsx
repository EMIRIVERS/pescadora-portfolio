import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/admin/kanban/kanban-board'
import type {
  KanbanBoardWithTasks,
  KanbanTaskWithAssignee,
} from '@/lib/supabase/types'
import { Kanban } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ project?: string }>
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchBoardsWithTasks(
  projectId?: string
): Promise<KanbanBoardWithTasks[]> {
  const supabase = await createClient()

  let boardsQuery = supabase
    .from('task_boards')
    .select('*')
    .order('position', { ascending: true })

  if (projectId) {
    boardsQuery = boardsQuery.eq('project_id', projectId)
  }

  const { data: boards, error: boardsError } = await boardsQuery

  if (boardsError || !boards || boards.length === 0) return []

  type RawBoard = { id: string; [key: string]: unknown }
  const typedBoards = boards as unknown as RawBoard[]
  const boardIds = typedBoards.map((b) => b.id)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, assignee:profiles(*)')
    .in('board_id', boardIds)
    .order('position', { ascending: true })

  type TaskWithBoardId = KanbanTaskWithAssignee & { board_id: string }
  const typedTasks = (tasks ?? []) as unknown as TaskWithBoardId[]

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function KanbanPage({ searchParams }: PageProps) {
  const { project: projectId } = await searchParams

  const boards = await fetchBoardsWithTasks(projectId)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-8 h-14 flex items-center gap-3">
          <Kanban className="w-4 h-4 text-zinc-400" />
          <h1 className="text-sm font-semibold text-zinc-200 tracking-wide">
            Kanban
          </h1>
          {projectId && (
            <span className="ml-1 text-xs text-zinc-500">
              &mdash; project&nbsp;
              <span className="font-mono text-zinc-400">{projectId}</span>
            </span>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="px-8 py-8">
        <KanbanBoard
          projectId={projectId}
          initialBoards={boards}
        />
      </div>
    </div>
  )
}
