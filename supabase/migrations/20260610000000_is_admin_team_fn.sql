-- ============================================================
-- Helper RLS: is_admin_team()
-- Generated: 2026-06-10
-- La función ya existe en producción (creada manualmente como parte del
-- drift reconciliado — ver docs/RBAC_PLAN.md); esta migración la trae al
-- repo para que entornos nuevos/locales la tengan. CREATE OR REPLACE la
-- hace idempotente: re-aplicarla sobre producción no cambia nada.
-- Las políticas de 20260416000001 (leads/status_log) y 20260608040000
-- (audit_log) dependen de ella.
-- ============================================================

-- SECURITY DEFINER (mismo patrón que current_staff_role()/has_staff_role())
-- para que RLS pueda referenciarla sin evaluación recursiva de políticas.
CREATE OR REPLACE FUNCTION public.is_admin_team()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin_team = true
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_team() TO authenticated;
