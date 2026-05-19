-- ============================================================
-- Missing tables & columns needed by the admin dashboard
-- Generated: 2026-04-21
-- ============================================================

-- ── invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  client_id      uuid        REFERENCES public.clients(id)   ON DELETE SET NULL,
  project_id     uuid        REFERENCES public.projects(id)  ON DELETE SET NULL,
  invoice_number text        NOT NULL UNIQUE,
  title          text,
  amount         numeric(12,2) NOT NULL DEFAULT 0,
  currency       text        NOT NULL DEFAULT 'MXN',
  status         text        NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  issue_date     date        NOT NULL DEFAULT CURRENT_DATE,
  due_date       date,
  notes          text,
  paid_at        timestamptz
);

CREATE OR REPLACE FUNCTION set_invoices_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoices_updated_at();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_invoices" ON public.invoices FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));

CREATE INDEX IF NOT EXISTS invoices_client_id_idx  ON public.invoices (client_id);
CREATE INDEX IF NOT EXISTS invoices_project_id_idx ON public.invoices (project_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx     ON public.invoices (status);

-- ── proposals ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposals (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  client_id    uuid        REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_id      uuid        REFERENCES public.leads(id)   ON DELETE SET NULL,
  title        text        NOT NULL,
  description  text,
  items        jsonb       NOT NULL DEFAULT '[]',
  total        numeric(12,2) NOT NULL DEFAULT 0,
  currency     text        NOT NULL DEFAULT 'MXN',
  status       text        NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','sent','accepted','rejected')),
  valid_until  date,
  notes        text
);

CREATE OR REPLACE FUNCTION set_proposals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION set_proposals_updated_at();

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_proposals" ON public.proposals FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));

-- ── portfolio_categories ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portfolio_categories (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  name        text,
  slug        text    NOT NULL UNIQUE,
  label       text,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_visible  boolean NOT NULL DEFAULT true,
  cover_url   text
);

ALTER TABLE public.portfolio_categories ENABLE ROW LEVEL SECURITY;

-- Public can read visible categories
CREATE POLICY "public_read_portfolio_categories" ON public.portfolio_categories
  FOR SELECT USING (is_visible = true);

-- Admin team full access
CREATE POLICY "admin_all_portfolio_categories" ON public.portfolio_categories FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));

-- ── project_comments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid        NOT NULL REFERENCES public.projects(id)  ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_project_comments" ON public.project_comments FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));

CREATE INDEX IF NOT EXISTS project_comments_project_id_idx ON public.project_comments (project_id);

-- ── task_categories ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  color      text        NOT NULL DEFAULT '#8E8E93',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_task_categories" ON public.task_categories FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));

-- ── client_uploads ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_uploads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id   uuid        REFERENCES public.clients(id) ON DELETE SET NULL,
  file_name   text        NOT NULL,
  file_url    text        NOT NULL,
  file_size   bigint,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_client_uploads" ON public.client_uploads FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));

-- Clients can upload and read their own files
CREATE POLICY "client_own_uploads" ON public.client_uploads FOR ALL
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE profile_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS client_uploads_project_id_idx ON public.client_uploads (project_id);
CREATE INDEX IF NOT EXISTS client_uploads_client_id_idx  ON public.client_uploads (client_id);

-- ── photo_albums: add missing columns ────────────────────────────────────────
ALTER TABLE public.photo_albums
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.photo_albums(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_url  text;

-- Allow admin team full access to photo_albums (was missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'photo_albums' AND policyname = 'admin_all_photo_albums'
  ) THEN
    CREATE POLICY "admin_all_photo_albums" ON public.photo_albums FOR ALL
      USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));
  END IF;
END $$;

-- Allow admin team full access to portfolio_photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'portfolio_photos' AND policyname = 'admin_all_portfolio_photos'
  ) THEN
    CREATE POLICY "admin_all_portfolio_photos" ON public.portfolio_photos FOR ALL
      USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));
  END IF;
END $$;
