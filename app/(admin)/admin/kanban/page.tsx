import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/admin/kanban/kanban-board'
import type {
  KanbanBoardWithTasks,
  KanbanTaskWithAssignee,
} from '@/lib/supabase/types'
import { Plus } from 'lucide-react'

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
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#111111',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-10"
        style={{
          backgroundColor: 'rgba(17,17,17,0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1
              className="font-semibold"
              style={{ color: '#F5F5F7', fontSize: '18px', letterSpacing: '-0.01em' }}
            >
              Kanban
            </h1>
            {projectId && (
              <span
                className="text-xs font-mono"
                style={{ color: '#48484A' }}
              >
                &mdash;&nbsp;{projectId}
              </span>
            )}
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 transition-opacity hover:opacity-80 active:opacity-60"
            style={{
              backgroundColor: '#0071E3',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '8px',
              padding: '6px 14px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} aria-hidden="true" />
            New task
          </button>
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
