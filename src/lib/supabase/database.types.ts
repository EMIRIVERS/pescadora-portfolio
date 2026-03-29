// Pescadora — Supabase Database type definitions
// Matches the full platform schema (profiles, clients, projects, deliverables, tasks).
// Do NOT edit manually — regenerate with:
//   npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---------------------------------------------------------------------------
// Column-level enums
// ---------------------------------------------------------------------------

export type UserRole = 'admin_staff' | 'client'

export type ProjectStatus =
  | 'pre_production'
  | 'production'
  | 'post_production'
  | 'delivered'

export type DeliverableType = 'wip' | 'final'

export type DeliverableStatus = 'pending' | 'review' | 'approved'

export type TaskPriority = 'low' | 'medium' | 'high'

// ---------------------------------------------------------------------------
// Database interface
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      // -----------------------------------------------------------------------
      // profiles
      // -----------------------------------------------------------------------
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: UserRole
          is_admin_team: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role?: UserRole
          is_admin_team?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: UserRole
          is_admin_team?: boolean
          created_at?: string
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

      // -----------------------------------------------------------------------
      // clients
      // -----------------------------------------------------------------------
      clients: {
        Row: {
          id: string
          name: string
          email: string
          contact_person: string | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          contact_person?: string | null
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          contact_person?: string | null
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clients_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }

      // -----------------------------------------------------------------------
      // projects
      // -----------------------------------------------------------------------
      projects: {
        Row: {
          id: string
          title: string
          description: string | null
          client_id: string
          status: ProjectStatus
          start_date: string | null
          end_date: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          client_id: string
          status?: ProjectStatus
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          client_id?: string
          status?: ProjectStatus
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          created_by?: string
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

      // -----------------------------------------------------------------------
      // project_deliverables
      // -----------------------------------------------------------------------
      project_deliverables: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          url: string | null
          type: DeliverableType
          status: DeliverableStatus
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          url?: string | null
          type?: DeliverableType
          status?: DeliverableStatus
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          url?: string | null
          type?: DeliverableType
          status?: DeliverableStatus
          created_at?: string
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

      // -----------------------------------------------------------------------
      // task_boards
      // -----------------------------------------------------------------------
      task_boards: {
        Row: {
          id: string
          title: string
          project_id: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          project_id?: string | null
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          project_id?: string | null
          position?: number
          created_at?: string
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

      // -----------------------------------------------------------------------
      // tasks
      // -----------------------------------------------------------------------
      tasks: {
        Row: {
          id: string
          board_id: string
          title: string
          description: string | null
          assignee_id: string | null
          priority: TaskPriority
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          board_id: string
          title: string
          description?: string | null
          assignee_id?: string | null
          priority?: TaskPriority
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          title?: string
          description?: string | null
          assignee_id?: string | null
          priority?: TaskPriority
          position?: number
          created_at?: string
          updated_at?: string
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

      // -----------------------------------------------------------------------
      // task_activity_log
      // -----------------------------------------------------------------------
      task_activity_log: {
        Row: {
          id: string
          task_id: string
          user_id: string
          action: string
          old_value: string | null
          new_value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          action: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          action?: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_activity_log_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_activity_log_user_id_fkey'
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

// ---------------------------------------------------------------------------
// Generic table helpers — mirrors the Supabase CLI codegen pattern
// ---------------------------------------------------------------------------

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
