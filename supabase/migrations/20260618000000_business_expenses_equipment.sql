-- ============================================================
-- Gastos generales del negocio + Inventario de equipo de producción
-- Generated: 2026-06-18
-- ============================================================

-- ── business_expenses ─────────────────────────────────────────────────────────
-- Gastos generales del negocio (renta, suscripciones, compra de equipo,
-- viáticos, nómina, etc.). Independientes de un proyecto, aunque pueden
-- ligarse opcionalmente a uno vía project_id.
CREATE TABLE IF NOT EXISTS public.business_expenses (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  label          text          NOT NULL,
  amount         numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency       text          NOT NULL DEFAULT 'MXN',
  category       text,         -- renta, suscripciones, equipo, viaticos, nomina, marketing, impuestos, software, transporte, otros
  vendor         text,         -- proveedor / comercio
  payment_method text,         -- efectivo, transferencia, tarjeta, otro
  status         text          NOT NULL DEFAULT 'paid'
                   CHECK (status IN ('pending','paid')),
  date           date          NOT NULL DEFAULT CURRENT_DATE,
  project_id     uuid          REFERENCES public.projects(id) ON DELETE SET NULL,
  receipt_url    text,         -- recibo/factura en Supabase Storage
  notes          text
);

CREATE OR REPLACE FUNCTION set_business_expenses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS business_expenses_updated_at ON public.business_expenses;
CREATE TRIGGER business_expenses_updated_at
  BEFORE UPDATE ON public.business_expenses
  FOR EACH ROW EXECUTE FUNCTION set_business_expenses_updated_at();

ALTER TABLE public.business_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_business_expenses" ON public.business_expenses FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));

CREATE INDEX IF NOT EXISTS business_expenses_date_idx     ON public.business_expenses (date DESC);
CREATE INDEX IF NOT EXISTS business_expenses_category_idx ON public.business_expenses (category);
CREATE INDEX IF NOT EXISTS business_expenses_status_idx   ON public.business_expenses (status);

-- ── production_equipment ───────────────────────────────────────────────────────
-- Inventario de equipo de producción: cámaras, lentes, iluminación, audio,
-- soportes/estabilización, energía/almacenamiento, drones y accesorios.
CREATE TABLE IF NOT EXISTS public.production_equipment (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  name           text          NOT NULL,
  brand          text,
  model          text,
  category       text          NOT NULL DEFAULT 'otros'
                   CHECK (category IN (
                     'camaras','lentes','iluminacion','audio',
                     'soportes','energia','drones','accesorios','otros'
                   )),
  status         text          NOT NULL DEFAULT 'available'
                   CHECK (status IN ('available','in_use','maintenance','retired')),
  condition      text,         -- nuevo, excelente, bueno, regular, dañado
  serial_number  text,
  quantity       integer       NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  purchase_date  date,
  purchase_cost  numeric(12,2),
  currency       text          NOT NULL DEFAULT 'MXN',
  location       text,
  image_url      text,         -- foto principal en Supabase Storage
  specs          jsonb         NOT NULL DEFAULT '{}'::jsonb,  -- specs investigadas (clave/valor)
  notes          text
);

CREATE OR REPLACE FUNCTION set_production_equipment_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS production_equipment_updated_at ON public.production_equipment;
CREATE TRIGGER production_equipment_updated_at
  BEFORE UPDATE ON public.production_equipment
  FOR EACH ROW EXECUTE FUNCTION set_production_equipment_updated_at();

ALTER TABLE public.production_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_production_equipment" ON public.production_equipment FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));

CREATE INDEX IF NOT EXISTS production_equipment_category_idx ON public.production_equipment (category);
CREATE INDEX IF NOT EXISTS production_equipment_status_idx   ON public.production_equipment (status);
