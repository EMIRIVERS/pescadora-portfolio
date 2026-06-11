-- ============================================================
-- Reconciliación de drift: tablas creadas directo en producción
-- sin migración en el repo (notifications, client_types,
-- lead_client_types) + columna portfolio_photos.url.
-- Generated: 2026-06-10
--
-- En producción estas tablas YA existen — todo es idempotente
-- (IF NOT EXISTS / DO-guards) para que el push sea no-op ahí y
-- el esquema sea reproducible desde cero en entornos nuevos.
-- ============================================================

-- ── notifications ────────────────────────────────────────────────────────────
-- Avisos in-app para el equipo. Los inserts llegan vía service-role
-- (src/lib/notify.ts); el staff las lee/marca leídas desde el NotificationBell.
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  title       text        NOT NULL,
  body        text,
  type        text        NOT NULL DEFAULT 'info'
                CHECK (type IN ('info','success','warning','error')),
  entity_type text,
  entity_id   text,
  is_read     boolean     NOT NULL DEFAULT false
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
      AND policyname = 'admin_all_notifications'
  ) THEN
    CREATE POLICY "admin_all_notifications" ON public.notifications FOR ALL
      USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_is_read_idx    ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications (created_at DESC);

-- ── client_types ─────────────────────────────────────────────────────────────
-- Catálogo de tipos de cliente (etiquetas de leads), gestionado por staff.
CREATE TABLE IF NOT EXISTS public.client_types (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  label      text        NOT NULL,
  color      text        NOT NULL DEFAULT '#8E8E93',
  sort_order integer     NOT NULL DEFAULT 0
);

ALTER TABLE public.client_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'client_types'
      AND policyname = 'admin_all_client_types'
  ) THEN
    CREATE POLICY "admin_all_client_types" ON public.client_types FOR ALL
      USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));
  END IF;
END $$;

-- ── lead_client_types ────────────────────────────────────────────────────────
-- Join N:M entre leads y client_types.
CREATE TABLE IF NOT EXISTS public.lead_client_types (
  lead_id        uuid NOT NULL REFERENCES public.leads(id)        ON DELETE CASCADE,
  client_type_id uuid NOT NULL REFERENCES public.client_types(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, client_type_id)
);

ALTER TABLE public.lead_client_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_client_types'
      AND policyname = 'admin_all_lead_client_types'
  ) THEN
    CREATE POLICY "admin_all_lead_client_types" ON public.lead_client_types FOR ALL
      USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin_team = true));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS lead_client_types_client_type_idx ON public.lead_client_types (client_type_id);

-- ── portfolio_photos.url ─────────────────────────────────────────────────────
-- Columna usada por el código (src/lib/actions/photos.ts) pero ausente de la
-- migración original de photo_albums.
ALTER TABLE public.portfolio_photos ADD COLUMN IF NOT EXISTS url text;
