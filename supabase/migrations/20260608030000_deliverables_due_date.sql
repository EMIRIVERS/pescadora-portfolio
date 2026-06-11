-- ============================================================
-- project_deliverables.due_date
-- Generated: 2026-06-08
-- La vista de calendario (admin) consulta project_deliverables.due_date para
-- ubicar entregables en el mes, pero ninguna migración previa creaba la columna.
-- Aditiva e idempotente.
-- ============================================================

ALTER TABLE public.project_deliverables
  ADD COLUMN IF NOT EXISTS due_date date;
