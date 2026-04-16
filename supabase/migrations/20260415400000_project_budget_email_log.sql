-- Budget y notas en proyectos
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS budget numeric(12,2),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- Tabla para log de emails enviados
CREATE TABLE IF NOT EXISTS email_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email text NOT NULL,
  subject text NOT NULL,
  template_name text NOT NULL,
  related_id uuid,
  related_type text,
  status text DEFAULT 'sent',
  error_message text,
  sent_at timestamptz DEFAULT now()
);

-- RLS email_log (solo admin_team puede ver)
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_team_full_email_log"
  ON email_log
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin_team = true
    )
  );

-- Index para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS email_log_related_id_idx ON email_log (related_id);
CREATE INDEX IF NOT EXISTS email_log_sent_at_idx ON email_log (sent_at DESC);
