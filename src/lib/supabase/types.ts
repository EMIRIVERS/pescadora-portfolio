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
export type StaffRole = 'owner' | 'producer' | 'finance' | 'editor' | 'assistant'
export type ProjectStatus = 'pre_production' | 'production' | 'post_production' | 'delivered'
export type DeliverableType = 'wip' | 'final'
export type DeliverableStatus = 'pending' | 'review' | 'approved'
export type TaskPriority = 'low' | 'medium' | 'high'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
export type LeadSource = 'manual' | 'referral' | 'instagram' | 'web' | 'whatsapp' | 'other'
export type LeadActivityType = 'note' | 'email' | 'call' | 'whatsapp' | 'meeting' | 'status_change'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected'
export type BillingClientType = 'DIRECTO' | 'EMPRESA'
export type CalendarEventTypeEnum = 'grabacion' | 'entrega' | 'cobro' | 'reunion' | 'otro'
export type CalendarEventStatusEnum = 'pendiente' | 'hecho'
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

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
          staff_role: StaffRole | null
          display_role: string | null
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
          staff_role?: StaffRole | null
          display_role?: string | null
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
          staff_role?: StaffRole | null
          display_role?: string | null
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
          phone: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email?: string | null
          company?: string | null
          avatar_url?: string | null
          profile_id?: string | null
          phone?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string | null
          company?: string | null
          avatar_url?: string | null
          profile_id?: string | null
          phone?: string | null
          notes?: string | null
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
          budget: number | null
          currency: string | null
          internal_notes: string | null
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
          budget?: number | null
          currency?: string | null
          internal_notes?: string | null
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
          budget?: number | null
          currency?: string | null
          internal_notes?: string | null
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
          due_date: string | null
          client_feedback: string | null
          client_approved_at: string | null
          client_rejected_at: string | null
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
          due_date?: string | null
          client_feedback?: string | null
          client_approved_at?: string | null
          client_rejected_at?: string | null
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
          due_date?: string | null
          client_feedback?: string | null
          client_approved_at?: string | null
          client_rejected_at?: string | null
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
      task_categories: {
        Row: {
          id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          name?: string
          color?: string
        }
        Relationships: []
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
          project_id: string | null
          category: string | null
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
          project_id?: string | null
          category?: string | null
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
          project_id?: string | null
          category?: string | null
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
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
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
      leads: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          email: string | null
          phone: string | null
          company: string | null
          status: LeadStatus
          source: LeadSource
          notes: string | null
          wa_message: string | null
          budget_range: string | null
          project_type: string | null
          assigned_to: string | null
          last_contacted_at: string | null
          expected_close_date: string | null
          converted_to_client_id: string | null
          budget_estimate: number | null
          next_action: string | null
          next_action_date: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: LeadStatus
          source?: LeadSource
          notes?: string | null
          wa_message?: string | null
          budget_range?: string | null
          project_type?: string | null
          assigned_to?: string | null
          last_contacted_at?: string | null
          expected_close_date?: string | null
          converted_to_client_id?: string | null
          budget_estimate?: number | null
          next_action?: string | null
          next_action_date?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: LeadStatus
          source?: LeadSource
          notes?: string | null
          wa_message?: string | null
          budget_range?: string | null
          project_type?: string | null
          assigned_to?: string | null
          last_contacted_at?: string | null
          expected_close_date?: string | null
          converted_to_client_id?: string | null
          budget_estimate?: number | null
          next_action?: string | null
          next_action_date?: string | null
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          id: string
          lead_id: string
          user_id: string | null
          created_at: string
          type: LeadActivityType
          content: string | null
          old_status: string | null
          new_status: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          user_id?: string | null
          created_at?: string
          type: LeadActivityType
          content?: string | null
          old_status?: string | null
          new_status?: string | null
        }
        Update: {
          content?: string | null
        }
        Relationships: []
      }
      portfolio_videos: {
        Row: {
          id: string
          title: string
          vimeo_id: string
          category: string
          client_name: string
          year: string
          role: string
          description: string
          sort_order: number
          is_visible: boolean
          cover_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          vimeo_id: string
          category?: string
          client_name?: string
          year?: string
          role?: string
          description?: string
          sort_order?: number
          is_visible?: boolean
          cover_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          vimeo_id?: string
          category?: string
          client_name?: string
          year?: string
          role?: string
          description?: string
          sort_order?: number
          is_visible?: boolean
          cover_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          id: string
          sent_at: string
          to_email: string
          subject: string
          template_name: string | null
          related_id: string | null
          related_type: string | null
          status: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          sent_at?: string
          to_email: string
          subject: string
          template_name?: string | null
          related_id?: string | null
          related_type?: string | null
          status?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          to_email?: string
          subject?: string
          template_name?: string | null
          related_id?: string | null
          related_type?: string | null
          status?: string | null
          error_message?: string | null
        }
        Relationships: []
      }
      client_uploads: {
        Row: {
          id: string
          project_id: string
          client_id: string | null
          file_name: string
          file_url: string
          file_size: number | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          project_id: string
          client_id?: string | null
          file_name: string
          file_url: string
          file_size?: number | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          client_id?: string | null
          file_name?: string
          file_url?: string
          file_size?: number | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_uploads_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_uploads_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      project_expenses: {
        Row: {
          id: string
          project_id: string
          created_at: string
          label: string
          amount: number
          category: string | null
          notes: string | null
          date: string | null
        }
        Insert: {
          id?: string
          project_id: string
          created_at?: string
          label: string
          amount: number
          category?: string | null
          notes?: string | null
          date?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          label?: string
          amount?: number
          category?: string | null
          notes?: string | null
          date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'project_expenses_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      deliverable_revisions: {
        Row: {
          id: string
          deliverable_id: string
          revision_number: number
          url: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          deliverable_id: string
          revision_number: number
          url?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          deliverable_id?: string
          revision_number?: number
          url?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deliverable_revisions_deliverable_id_fkey'
            columns: ['deliverable_id']
            isOneToOne: false
            referencedRelation: 'project_deliverables'
            referencedColumns: ['id']
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          client_id: string | null
          project_id: string | null
          invoice_number: string
          title: string | null
          amount: number
          currency: string
          status: InvoiceStatus
          issue_date: string
          due_date: string | null
          notes: string | null
          paid_at: string | null
          items: Json
          subtotal: number
          tax: Json | null
          client_type: BillingClientType
          fiscal_data: Json | null
          proposal_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          client_id?: string | null
          project_id?: string | null
          invoice_number: string
          title?: string | null
          amount: number
          currency?: string
          status?: InvoiceStatus
          issue_date?: string
          due_date?: string | null
          notes?: string | null
          paid_at?: string | null
          items?: Json
          subtotal?: number
          tax?: Json | null
          client_type?: BillingClientType
          fiscal_data?: Json | null
          proposal_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          client_id?: string | null
          project_id?: string | null
          invoice_number?: string
          title?: string | null
          amount?: number
          currency?: string
          status?: InvoiceStatus
          issue_date?: string
          due_date?: string | null
          notes?: string | null
          paid_at?: string | null
          items?: Json
          subtotal?: number
          tax?: Json | null
          client_type?: BillingClientType
          fiscal_data?: Json | null
          proposal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_proposal_id_fkey'
            columns: ['proposal_id']
            isOneToOne: false
            referencedRelation: 'proposals'
            referencedColumns: ['id']
          },
        ]
      }
      proposals: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          client_id: string | null
          lead_id: string | null
          title: string
          description: string | null
          items: Json
          total: number
          currency: string
          status: ProposalStatus
          valid_until: string | null
          notes: string | null
          subtotal: number
          tax: Json | null
          client_type: BillingClientType
          fiscal_data: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          client_id?: string | null
          lead_id?: string | null
          title: string
          description?: string | null
          items?: Json
          total?: number
          currency?: string
          status?: ProposalStatus
          valid_until?: string | null
          notes?: string | null
          subtotal?: number
          tax?: Json | null
          client_type?: BillingClientType
          fiscal_data?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          client_id?: string | null
          lead_id?: string | null
          title?: string
          description?: string | null
          items?: Json
          total?: number
          currency?: string
          status?: ProposalStatus
          valid_until?: string | null
          notes?: string | null
          subtotal?: number
          tax?: Json | null
          client_type?: BillingClientType
          fiscal_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'proposals_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'proposals_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
      }
      portfolio_categories: {
        Row: {
          id: string
          created_at: string
          name: string | null
          slug: string
          label: string | null
          description: string | null
          sort_order: number
          is_visible: boolean
          cover_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name?: string | null
          slug: string
          label?: string | null
          description?: string | null
          sort_order?: number
          is_visible?: boolean
          cover_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string | null
          slug?: string
          label?: string | null
          description?: string | null
          sort_order?: number
          is_visible?: boolean
          cover_url?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          project_id: string | null
          client_id: string | null
          invoice_id: string | null
          title: string
          type: CalendarEventTypeEnum
          event_date: string
          event_time: string | null
          notes: string | null
          status: CalendarEventStatusEnum
          created_by: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          project_id?: string | null
          client_id?: string | null
          invoice_id?: string | null
          title: string
          type?: CalendarEventTypeEnum
          event_date: string
          event_time?: string | null
          notes?: string | null
          status?: CalendarEventStatusEnum
          created_by?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          project_id?: string | null
          client_id?: string | null
          invoice_id?: string | null
          title?: string
          type?: CalendarEventTypeEnum
          event_date?: string
          event_time?: string | null
          notes?: string | null
          status?: CalendarEventStatusEnum
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_events_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      audit_log: {
        Row: {
          id: string
          created_at: string
          actor_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          summary: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          actor_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          summary?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          actor_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          summary?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      project_comments: {
        Row: {
          id: string
          project_id: string
          author_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          author_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          author_id?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_comments_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      project_status_log: {
        Row: {
          id: string
          project_id: string | null
          old_status: string | null
          new_status: string
          changed_by: string | null
          changed_at: string
          note: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          old_status?: string | null
          new_status: string
          changed_by?: string | null
          changed_at?: string
          note?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          old_status?: string | null
          new_status?: string
          changed_by?: string | null
          changed_at?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'project_status_log_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      photo_albums: {
        Row: {
          id: string
          slug: string
          label: string
          sort_order: number
          is_visible: boolean
          created_at: string
          parent_id: string | null
          cover_url: string | null
        }
        Insert: {
          id?: string
          slug: string
          label: string
          sort_order?: number
          is_visible?: boolean
          created_at?: string
          parent_id?: string | null
          cover_url?: string | null
        }
        Update: {
          id?: string
          slug?: string
          label?: string
          sort_order?: number
          is_visible?: boolean
          created_at?: string
          parent_id?: string | null
          cover_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'photo_albums_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'photo_albums'
            referencedColumns: ['id']
          },
        ]
      }
      portfolio_photos: {
        Row: {
          id: string
          album_id: string
          storage_path: string
          url: string | null
          alt_text: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          album_id: string
          storage_path: string
          url?: string | null
          alt_text?: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          album_id?: string
          storage_path?: string
          url?: string | null
          alt_text?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'portfolio_photos_album_id_fkey'
            columns: ['album_id']
            isOneToOne: false
            referencedRelation: 'photo_albums'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          created_at: string
          title: string
          body: string | null
          type: NotificationType
          entity_type: string | null
          entity_id: string | null
          is_read: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          body?: string | null
          type?: NotificationType
          entity_type?: string | null
          entity_id?: string | null
          is_read?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          body?: string | null
          type?: NotificationType
          entity_type?: string | null
          entity_id?: string | null
          is_read?: boolean
        }
        Relationships: []
      }
      client_types: {
        Row: {
          id: string
          created_at: string
          label: string
          color: string
          sort_order: number
        }
        Insert: {
          id?: string
          created_at?: string
          label: string
          color?: string
          sort_order?: number
        }
        Update: {
          id?: string
          created_at?: string
          label?: string
          color?: string
          sort_order?: number
        }
        Relationships: []
      }
      lead_client_types: {
        Row: {
          lead_id: string
          client_type_id: string
        }
        Insert: {
          lead_id: string
          client_type_id: string
        }
        Update: {
          lead_id?: string
          client_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lead_client_types_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_client_types_client_type_id_fkey'
            columns: ['client_type_id']
            isOneToOne: false
            referencedRelation: 'client_types'
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

export type Lead = Tables<'leads'>
export type LeadActivity = Tables<'lead_activities'>
export type ClientUpload = Tables<'client_uploads'>
export type ProjectExpense = Tables<'project_expenses'>
export type DeliverableRevision = Tables<'deliverable_revisions'>
export type TaskCategory = Tables<'task_categories'>



export interface LeadWithActivity extends Lead {
  activities: LeadActivity[]
}

export interface PortfolioVideo {
  id: string
  title: string
  vimeo_id: string
  category: string
  client_name: string
  year: string
  role: string
  description: string
  sort_order: number
  is_visible: boolean
  created_at: string
  updated_at: string
}

export type Invoice = Tables<'invoices'>
export type Proposal = Tables<'proposals'>
export type PortfolioCategory = Tables<'portfolio_categories'>
export type CalendarEventRow = Tables<'calendar_events'>
export type AuditLogRow = Tables<'audit_log'>
export type ProjectCommentRow = Tables<'project_comments'>
export type ProjectStatusLogRow = Tables<'project_status_log'>
export type PhotoAlbum = Tables<'photo_albums'>
export type PortfolioPhoto = Tables<'portfolio_photos'>
export type NotificationRow = Tables<'notifications'>
export type ClientTypeRow = Tables<'client_types'>
export type LeadClientType = Tables<'lead_client_types'>

export interface InvoiceWithRelations extends Invoice {
  clients: Pick<Client, 'name' | 'company'> | null
  projects: Pick<Project, 'title'> | null
}

export interface ProposalWithRelations extends Proposal {
  clients: Pick<Client, 'name' | 'company'> | null
}

