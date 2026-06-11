-- ============================================================
-- Audit log: trazabilidad de acciones del equipo interno (P1).
-- Generated: 2026-06-08
-- Registra quién (actor_id) hizo qué (action) sobre qué entidad
-- (entity_type / entity_id), con un resumen humano y metadata JSON.
-- Solo el equipo interno (is_admin_team) tiene acceso vía RLS; las
-- escrituras reales se hacen con el service-role client desde server.
-- Aditiva e idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  actor_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  entity_type text,
  entity_id   uuid,
  summary     text,
  metadata    jsonb       NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Equipo interno: acceso total. Las inserciones de producción usan el
-- service-role client (bypassa RLS); esta política cubre lecturas en el
-- panel y escrituras manuales del equipo.
DROP POLICY IF EXISTS "audit_log: staff full" ON public.audit_log;
CREATE POLICY "audit_log: staff full" ON public.audit_log FOR ALL
  USING      (public.is_admin_team())
  WITH CHECK (public.is_admin_team());

CREATE INDEX IF NOT EXISTS audit_log_entity_idx
  ON public.audit_log (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON public.audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_actor_id_idx
  ON public.audit_log (actor_id);
