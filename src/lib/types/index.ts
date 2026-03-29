// Pescadora — shared domain types
// Single source of truth for all platform entities.

export type {
  Database,
  Json,
  UserRole,
  ProjectStatus,
  DeliverableType,
  DeliverableStatus,
  TaskPriority,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from '@/lib/supabase/database.types'

import type { Tables } from '@/lib/supabase/database.types'

// ---------------------------------------------------------------------------
// Base row convenience types
// ---------------------------------------------------------------------------

export type Profile = Tables<'profiles'>
export type Client = Tables<'clients'>
export type Project = Tables<'projects'>
export type Deliverable = Tables<'project_deliverables'>
export type TaskBoard = Tables<'task_boards'>
export type Task = Tables<'tasks'>
export type ActivityLog = Tables<'task_activity_log'>

// ---------------------------------------------------------------------------
// Joined / enriched types
// ---------------------------------------------------------------------------

/** Project row with the parent client's display name resolved. */
export type ProjectWithClient = Project & {
  client: Pick<Client, 'id' | 'name' | 'email'>
}

/** Task row with the assigned team-member's profile resolved. */
export type TaskWithAssignee = Task & {
  assignee: Pick<Profile, 'id' | 'full_name' | 'email'> | null
}

/** Board row with all of its tasks pre-loaded and sorted by position. */
export type BoardWithTasks = TaskBoard & {
  tasks: TaskWithAssignee[]
}

/** Project with all boards (each board includes its tasks). */
export type ProjectFull = ProjectWithClient & {
  boards: BoardWithTasks[]
  deliverables: Deliverable[]
}
