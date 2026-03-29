-- ============================================================
-- Pescadora Platform — Migration v3
-- Project assignments: many-to-many staff <-> projects
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_assignments (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'member',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, profile_id)
);

ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments: staff full" ON public.project_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin_team = true));

CREATE INDEX IF NOT EXISTS idx_assignments_project_id ON public.project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_profile_id ON public.project_assignments(profile_id);
