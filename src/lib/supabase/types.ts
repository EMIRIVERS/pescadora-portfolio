export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      client_types: {
        Row: {
          color: string
          created_at: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      client_uploads: {
        Row: {
          client_id: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          project_id: string
          uploaded_at: string | null
        }
        Insert: {
          client_id?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          project_id: string
          uploaded_at?: string | null
        }
        Update: {
          client_id?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          project_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_uploads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          profile_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_comments: {
        Row: {
          content: string
          created_at: string
          deliverable_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deliverable_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deliverable_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_comments_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "project_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_revisions: {
        Row: {
          created_at: string
          deliverable_id: string
          id: string
          notes: string | null
          revision_number: number
          url: string | null
        }
        Insert: {
          created_at?: string
          deliverable_id: string
          id?: string
          notes?: string | null
          revision_number: number
          url?: string | null
        }
        Update: {
          created_at?: string
          deliverable_id?: string
          id?: string
          notes?: string | null
          revision_number?: number
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_revisions_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "project_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          error_message: string | null
          id: string
          related_id: string | null
          related_type: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_name: string
          to_email: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_name: string
          to_email: string
        }
        Update: {
          error_message?: string | null
          id?: string
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_name?: string
          to_email?: string
        }
        Relationships: []
      }
      error_log: {
        Row: {
          component: string | null
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          stack: string | null
          url: string | null
        }
        Insert: {
          component?: string | null
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          stack?: string | null
          url?: string | null
        }
        Update: {
          component?: string | null
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          stack?: string | null
          url?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string | null
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          project_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          content: string | null
          created_at: string
          id: string
          lead_id: string
          new_status: string | null
          old_status: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          lead_id: string
          new_status?: string | null
          old_status?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          new_status?: string | null
          old_status?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_client_types: {
        Row: {
          client_type_id: string
          lead_id: string
        }
        Insert: {
          client_type_id: string
          lead_id: string
        }
        Update: {
          client_type_id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_client_types_client_type_id_fkey"
            columns: ["client_type_id"]
            isOneToOne: false
            referencedRelation: "client_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_client_types_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          budget_estimate: number | null
          budget_range: string | null
          company: string | null
          converted_to_client_id: string | null
          created_at: string
          email: string | null
          expected_close_date: string | null
          id: string
          last_contacted_at: string | null
          name: string
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          phone: string | null
          project_type: string | null
          source: string
          status: string
          updated_at: string
          wa_message: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget_estimate?: number | null
          budget_range?: string | null
          company?: string | null
          converted_to_client_id?: string | null
          created_at?: string
          email?: string | null
          expected_close_date?: string | null
          id?: string
          last_contacted_at?: string | null
          name: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          project_type?: string | null
          source?: string
          status?: string
          updated_at?: string
          wa_message?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget_estimate?: number | null
          budget_range?: string | null
          company?: string | null
          converted_to_client_id?: string | null
          created_at?: string
          email?: string | null
          expected_close_date?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          project_type?: string | null
          source?: string
          status?: string
          updated_at?: string
          wa_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_to_client_id_fkey"
            columns: ["converted_to_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          title: string
          type?: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      photo_albums: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          is_visible: boolean
          label: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          label: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          label?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "photo_albums_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_categories: {
        Row: {
          cover_url: string | null
          created_at: string | null
          id: string
          is_visible: boolean | null
          label: string
          slug: string
          sort_order: number | null
          type: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          label: string
          slug: string
          sort_order?: number | null
          type?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          label?: string
          slug?: string
          sort_order?: number | null
          type?: string
        }
        Relationships: []
      }
      portfolio_photos: {
        Row: {
          album_id: string
          alt_text: string
          created_at: string
          id: string
          sort_order: number
          storage_path: string
          url: string | null
        }
        Insert: {
          album_id: string
          alt_text?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
          url?: string | null
        }
        Update: {
          album_id?: string
          alt_text?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_videos: {
        Row: {
          category: string
          client_name: string
          cover_url: string | null
          created_at: string
          description: string
          id: string
          is_visible: boolean
          role: string
          sort_order: number
          title: string
          updated_at: string
          vimeo_id: string
          year: string
        }
        Insert: {
          category?: string
          client_name?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          is_visible?: boolean
          role?: string
          sort_order?: number
          title: string
          updated_at?: string
          vimeo_id: string
          year?: string
        }
        Update: {
          category?: string
          client_name?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          is_visible?: boolean
          role?: string
          sort_order?: number
          title?: string
          updated_at?: string
          vimeo_id?: string
          year?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_role: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin_team: boolean
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_role?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin_team?: boolean
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_role?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin_team?: boolean
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          project_id: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          project_id: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_deliverables: {
        Row: {
          client_approved_at: string | null
          client_feedback: string | null
          client_rejected_at: string | null
          created_at: string
          description: string | null
          id: string
          project_id: string
          sort_order: number
          status: string
          title: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          client_approved_at?: string | null
          client_feedback?: string | null
          client_rejected_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          sort_order?: number
          status?: string
          title: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          client_approved_at?: string | null
          client_feedback?: string | null
          client_rejected_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          sort_order?: number
          status?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string | null
          id: string
          label: string
          notes: string | null
          project_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          date?: string | null
          id?: string
          label: string
          notes?: string | null
          project_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string | null
          id?: string
          label?: string
          notes?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_status_log: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: string
          note: string | null
          old_status: string | null
          project_id: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
          project_id?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_status_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          id: string
          internal_notes: string | null
          is_public: boolean
          portfolio_order: number
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          internal_notes?: string | null
          is_public?: boolean
          portfolio_order?: number
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          internal_notes?: string | null
          is_public?: boolean
          portfolio_order?: number
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_boards: {
        Row: {
          color: string | null
          created_at: string
          id: string
          position: number
          project_id: string | null
          title: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          position?: number
          project_id?: string | null
          title: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          position?: number
          project_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          board_id: string
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string
          project_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          board_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          project_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          board_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          project_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_team: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
