-- ============================================================
-- RBAC: rol de staff fino sobre is_admin_team
-- Generated: 2026-06-08  (renumerado de 040000 → 060000 para no chocar con
-- audit_log/realtime ya aplicados)
-- Aditiva. is_admin_team se mantiene como el booleano grueso staff-vs-cliente
-- y el respaldo de RLS; staff_role agrega granularidad encima.
-- ============================================================

-- 1. Enum de sub-roles de staff (separado de user_role para no tocar el enum
--    del que dependen RLS y los tipos generados).
DO $$ BEGIN
  CREATE TYPE public.staff_role AS ENUM ('owner','producer','finance','editor','assistant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Columna aditiva. NULL = no-staff (clientes) o filas legacy.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS staff_role public.staff_role;

-- 3. Backfill: todo staff actual queda como 'owner' para que nadie se quede
--    fuera al activar el gating. Luego un owner reasigna roles desde la UI.
UPDATE public.profiles
  SET staff_role = 'owner'
  WHERE is_admin_team = true AND staff_role IS NULL;

-- 4. Invariante: staff_role implica is_admin_team (un cliente nunca lleva rol).
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_staff_role_requires_team
    CHECK (staff_role IS NULL OR is_admin_team = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Helpers SECURITY DEFINER (mismo patrón que is_admin_team()) para que RLS
--    pueda referenciarlos sin evaluación recursiva de políticas.
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS public.staff_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT staff_role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_staff_role(VARIADIC roles public.staff_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin_team = true AND staff_role = ANY(roles)
  )
$$;

GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_staff_role(public.staff_role[]) TO authenticated;
