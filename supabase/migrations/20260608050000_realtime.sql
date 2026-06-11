-- 20260608050000_realtime.sql
-- P1 Realtime: add tables consumed live by the admin UI to the
-- `supabase_realtime` publication so Postgres CDC (postgres_changes) events
-- are delivered to the browser.
--
-- Tables added:
--   public.leads    -> sidebar badges, dashboard RealtimeStats, LeadsPipeline
--   public.projects -> dashboard RealtimeStats
--
-- Idempotent & additive: each ADD TABLE is guarded by a pg_publication_tables
-- check so re-running (or running against an instance where the table is
-- already published) is a no-op instead of an error.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;
END
$$;
