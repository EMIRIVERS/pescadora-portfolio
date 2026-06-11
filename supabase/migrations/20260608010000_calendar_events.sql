-- ============================================================
-- Calendario operativo: eventos tipados (grabación, entrega, cobro, reunión)
-- Generated: 2026-06-08
-- Cada evento se liga a un proyecto y a un cliente; los de tipo 'cobro'
-- pueden enlazar una factura. El cliente ve sus eventos vía RLS.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  project_id  uuid        REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id   uuid        REFERENCES public.clients(id)  ON DELETE SET NULL,
  invoice_id  uuid        REFERENCES public.invoices(id) ON DELETE SET NULL,
  title       text        NOT NULL,
  type        text        NOT NULL DEFAULT 'otro'
                CHECK (type IN ('grabacion','entrega','cobro','reunion','otro')),
  event_date  date        NOT NULL,
  event_time  time,
  notes       text,
  status      text        NOT NULL DEFAULT 'pendiente'
                CHECK (status IN ('pendiente','hecho')),
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION set_calendar_events_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_calendar_events_updated_at();

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Equipo interno: acceso total
CREATE POLICY "calendar_events: staff full" ON public.calendar_events FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin_team = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin_team = true));

-- Cliente: lectura de sus propios eventos (por client_id ligado a su profile)
CREATE POLICY "calendar_events: client read own" ON public.calendar_events FOR SELECT
  USING (client_id IN (SELECT c.id FROM public.clients c WHERE c.profile_id = auth.uid()));

CREATE INDEX IF NOT EXISTS calendar_events_project_id_idx ON public.calendar_events (project_id);
CREATE INDEX IF NOT EXISTS calendar_events_client_id_idx  ON public.calendar_events (client_id);
CREATE INDEX IF NOT EXISTS calendar_events_date_idx       ON public.calendar_events (event_date);
