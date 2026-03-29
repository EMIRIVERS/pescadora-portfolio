-- ============================================================
-- Pescadora Platform — Migration v2
-- Deliverable Comments
-- ============================================================

CREATE TABLE public.deliverable_comments (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id uuid        NOT NULL REFERENCES public.project_deliverables(id) ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content        text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deliverable_comments ENABLE ROW LEVEL SECURITY;

-- Staff: full access
CREATE POLICY "comments: staff full" ON public.deliverable_comments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin_team = true));

-- Client: can read comments on their deliverables
CREATE POLICY "comments: client read own" ON public.deliverable_comments FOR SELECT
  USING (deliverable_id IN (
    SELECT pd.id FROM public.project_deliverables pd
    JOIN public.projects pr ON pr.id = pd.project_id
    JOIN public.clients c ON c.id = pr.client_id
    WHERE c.profile_id = auth.uid()
  ));

-- Client: can insert their own comments on their deliverables
CREATE POLICY "comments: client insert own" ON public.deliverable_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    deliverable_id IN (
      SELECT pd.id FROM public.project_deliverables pd
      JOIN public.projects pr ON pr.id = pd.project_id
      JOIN public.clients c ON c.id = pr.client_id
      WHERE c.profile_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_comments_deliverable_id ON public.deliverable_comments(deliverable_id);
