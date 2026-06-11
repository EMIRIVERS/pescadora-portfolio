-- ============================================================
-- RLS: el cliente puede LEER sus propias facturas
-- Generated: 2026-06-08
-- Hasta ahora invoices solo tenía la política admin (admin_all_invoices), por lo
-- que el portal del cliente (facturas y rendimiento) no veía ningún registro.
-- Esta política da lectura al cliente sobre las facturas de su client_id.
-- Aditiva e idempotente.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invoices' AND policyname = 'invoices: client read own'
  ) THEN
    CREATE POLICY "invoices: client read own" ON public.invoices FOR SELECT
      USING (client_id IN (SELECT c.id FROM public.clients c WHERE c.profile_id = auth.uid()));
  END IF;
END $$;
