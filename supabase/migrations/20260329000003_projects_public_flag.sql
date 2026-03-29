-- ============================================================
-- Pescadora Platform — Migration v4
-- Adds public-portfolio columns and RLS policies for anonymous
-- portfolio readers.
-- ============================================================

-- is_public  : controls visibility on the public portfolio
-- portfolio_order : manual sort order (lower = first)
-- cover_url  : already exists in v1; ALTER is a no-op guard only
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_public       boolean NOT NULL DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS portfolio_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS cover_url       text;   -- guard: column was created in v1

-- Partial index for fast portfolio queries
CREATE INDEX IF NOT EXISTS idx_projects_is_public
    ON public.projects(portfolio_order)
    WHERE is_public = true;

-- Allow anonymous (unauthenticated) users to read public projects
CREATE POLICY "projects: public read"
    ON public.projects FOR SELECT
    USING (is_public = true);

-- Allow anonymous users to read deliverables that belong to public projects
CREATE POLICY "deliverables: public read"
    ON public.project_deliverables FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE is_public = true
        )
    );
