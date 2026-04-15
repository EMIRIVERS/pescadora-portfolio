-- portfolio_videos: tabla manejada desde el admin para controlar todos los videos del portfolio
CREATE TABLE IF NOT EXISTS portfolio_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  vimeo_id text NOT NULL,
  category text NOT NULL DEFAULT 'comercial',
  client_name text NOT NULL DEFAULT '',
  year text NOT NULL DEFAULT '2025',
  role text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE portfolio_videos ENABLE ROW LEVEL SECURITY;

-- Admin team tiene acceso total
CREATE POLICY "admin_team_all" ON portfolio_videos
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin_team = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin_team = true)
  );

-- Público solo puede leer los visibles
CREATE POLICY "anon_read_visible" ON portfolio_videos
  FOR SELECT TO anon, authenticated
  USING (is_visible = true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_portfolio_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER portfolio_videos_updated_at
  BEFORE UPDATE ON portfolio_videos
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_videos_updated_at();

-- Seed: videos existentes
INSERT INTO portfolio_videos (title, vimeo_id, category, client_name, year, role, sort_order) VALUES
  ('Como Fuego Lento', '1183459299', 'video-clip', '', '2025', 'Dirección y producción audiovisual', 1),
  ('Hipnotizado', '1183458974', 'video-clip', '', '2025', 'Dirección y producción audiovisual', 2),
  ('Amor Clásico', '1183463808', 'video-clip', '', '2025', 'Dirección y producción audiovisual', 3),
  ('Amor de Vaso', '1183459373', 'comercial', 'Amor de Vaso', '2025', 'Dirección y producción audiovisual', 4),
  ('Noma Mezcal', '1183457806', 'comercial', 'Noma Mezcal', '2025', 'Dirección y producción audiovisual', 5),
  ('ITSCO', '1183459324', 'comercial', 'ITSCO', '2025', 'Dirección y producción audiovisual', 6),
  ('CONADE', '1183458842', 'comercial', 'CONADE', '2025', 'Dirección y producción audiovisual', 7),
  ('Lucky Stash Corporativo', '1183459479', 'comercial', 'Lucky Stash', '2025', 'Producción audiovisual corporativa', 8),
  ('Lucky Stash', '1183458425', 'comercial', 'Lucky Stash', '2025', 'Dirección y producción audiovisual', 9),
  ('C3 Gallery', '1183457572', 'comercial', 'C3 Gallery', '2025', 'Dirección y producción audiovisual', 10),
  ('Cotorreo + Cacao', '1183464086', 'podcast', 'Cotorreo + Cacao', '2025', 'Producción audiovisual', 11);
