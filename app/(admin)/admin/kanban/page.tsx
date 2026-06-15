import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/admin/kanban/kanban-board'
import { ProjectFilterSelect } from '@/components/admin/kanban/project-filter-select'
import { NewTaskButton } from '@/components/admin/kanban/new-task-button'
import type {
  KanbanBoardWithTasks,
  KanbanTaskWithAssignee,
  Project,
} from '@/lib/supabase/types'

interface PageProps {
  searchParams: Promise<{ project?: string }>
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchProjects(): Promise<Pick<Project, 'id' | 'title'>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id, title')
    .order('title', { ascending: true })
  return (data ?? []) as Pick<Project, 'id' | 'title'>[]
}

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

  const [boards, projects] = await Promise.all([
    fetchBoardsWithTasks(projectId),
    fetchProjects(),
  ])

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--dash-surface-1)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-10"
        style={{
          backgroundColor: 'var(--dash-surface-1)',
          borderBottom: '1px solid var(--dash-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1
              className="font-semibold"
              style={{ color: 'var(--dash-text-primary)', fontSize: '18px', letterSpacing: '-0.01em' }}
            >
              Kanban
            </h1>

            {/* Project filter */}
            <ProjectFilterSelect
              projects={projects}
              currentProjectId={projectId}
            />
          </div>

          <NewTaskButton />
        </div>
      </div>

      {/* Board */}
      <div className="px-8 py-8">
        <KanbanBoard
          projectId={projectId}
          initialBoards={boards}
          projects={projects}
        />
      </div>
    </div>
  )
}
