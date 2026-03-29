// Hand-written Supabase Database types.
// Replace with `npx supabase gen types typescript --project-id <id>` once the project is linked.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin_staff' | 'client'
export type ProjectStatus = 'pre_production' | 'production' | 'post_production' | 'delivered'
export type DeliverableType = 'wip' | 'final'
export type DeliverableStatus = 'pending' | 'review' | 'approved'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          is_admin_team: boolean
          role: UserRole | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          is_admin_team?: boolean
          role?: UserRole | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          is_admin_team?: boolean
          role?: UserRole | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      clients: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string | null
          company: string | null
          avatar_url: string | null
          profile_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email?: string | null
          company?: string | null
          avatar_url?: string | null
          profile_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string | null
          company?: string | null
          avatar_url?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'clients_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string | null
          client_id: string | null
          status: ProjectStatus
          start_date: string | null
          end_date: string | null
          cover_url: string | null
          created_by: string | null
          is_public: boolean
          portfolio_order: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description?: string | null
          client_id?: string | null
          status?: ProjectStatus
          start_date?: string | null
          end_date?: string | null
          cover_url?: string | null
          created_by?: string | null
          is_public?: boolean
          portfolio_order?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string | null
          client_id?: string | null
          status?: ProjectStatus
          start_date?: string | null
          end_date?: string | null
          cover_url?: string | null
          created_by?: string | null
          is_public?: boolean
          portfolio_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'projects_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      project_deliverables: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          project_id: string
          title: string
          description: string | null
          url: string | null
          type: DeliverableType
          status: DeliverableStatus
          sort_order: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          project_id: string
          title: string
          description?: string | null
          url?: string | null
          type?: DeliverableType
          status?: DeliverableStatus
          sort_order?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          project_id?: string
          title?: string
          description?: string | null
          url?: string | null
          type?: DeliverableType
          status?: DeliverableStatus
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'project_deliverables_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      task_boards: {
        Row: {
          id: string
          created_at: string
          title: string
          project_id: string | null
          position: number
          color: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          project_id?: string | null
          position?: number
          color?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          project_id?: string | null
          position?: number
          color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'task_boards_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          board_id: string
          title: string
          description: string | null
          assignee_id: string | null
          priority: TaskPriority
          position: number
          due_date: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          board_id: string
          title: string
          description?: string | null
          assignee_id?: string | null
          priority?: TaskPriority
          position?: number
          due_date?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          board_id?: string
          title?: string
          description?: string | null
          assignee_id?: string | null
          priority?: TaskPriority
          position?: number
          due_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_board_id_fkey'
            columns: ['board_id']
            isOneToOne: false
            referencedRelation: 'task_boards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      project_assignments: {
        Row: {
          id: string
          project_id: string
          profile_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          profile_id: string
          role?: string
          created_at?: string
        }
        Update: {
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_assignments_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_assignments_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      task_activity_log: {
        Row: {
          id: string
          created_at: string
          task_id: string
          user_id: string | null
          action: string
          old_value: string | null
          new_value: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          task_id: string
          user_id?: string | null
          action: string
          old_value?: string | null
          new_value?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          task_id?: string
          user_id?: string | null
          action?: string
          old_value?: string | null
          new_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'task_activity_log_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      deliverable_comments: {
        Row: {
          id: string
          deliverable_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          deliverable_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deliverable_comments_deliverable_id_fkey'
            columns: ['deliverable_id']
            isOneToOne: false
            referencedRelation: 'project_deliverables'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deliverable_comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      project_status: ProjectStatus
      deliverable_type: DeliverableType
      deliverable_status: DeliverableStatus
      task_priority: TaskPriority
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// Convenience aliases
export type Profile = Tables<'profiles'>
export type Client = Tables<'clients'>
export type Project = Tables<'projects'>
export type Deliverable = Tables<'project_deliverables'>
export type TaskBoard = Tables<'task_boards'>
export type Task = Tables<'tasks'>
export type ActivityLog = Tables<'task_activity_log'>
export type DeliverableComment = Tables<'deliverable_comments'>
export type ProjectAssignment = Tables<'project_assignments'>

// Joined types for project assignments
export interface ProjectAssignmentWithProfile extends ProjectAssignment {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email'>
}

// Joined types
export interface DeliverableCommentWithUser extends DeliverableComment {
  user: Pick<Profile, 'full_name' | 'avatar_url'>
}

export interface ClientWithProjectCount extends Client {
  project_count: number
}

export interface ProjectWithClient extends Project {
  client: Client | null
}

export interface TaskWithAssignee extends Task {
  assignee: Profile | null
}

export interface BoardWithTasks extends TaskBoard {
  tasks: TaskWithAssignee[]
}

// Legacy aliases kept for compatibility
export type KanbanTask = Task
export type KanbanTaskWithAssignee = TaskWithAssignee
export type KanbanBoard = TaskBoard
export type KanbanBoardWithTasks = BoardWithTasks
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskActivityLog = ActivityLog
