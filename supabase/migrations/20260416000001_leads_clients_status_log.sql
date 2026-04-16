-- Migration: leads_clients_status_log
-- Date: 2026-04-16
-- Description: Add budget/action columns to leads, contact/notes to clients,
--              display_role to profiles, and create project_status_log table.

-- 1. leads: additional tracking columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget_estimate numeric(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_action text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_action_date date;

-- 2. clients: contact and notes columns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes text;

-- 3. profiles: custom display role
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_role text;

-- 4. project_status_log: full history of project status changes
CREATE TABLE IF NOT EXISTS project_status_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  note text
);

ALTER TABLE project_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY psl_admin ON project_status_log
  FOR ALL TO authenticated
  USING (is_admin_team())
  WITH CHECK (is_admin_team());

CREATE INDEX IF NOT EXISTS psl_project_id_idx ON project_status_log(project_id);
CREATE INDEX IF NOT EXISTS psl_changed_at_idx ON project_status_log(changed_at DESC);
