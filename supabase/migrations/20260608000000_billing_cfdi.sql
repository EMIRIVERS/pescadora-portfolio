-- ============================================================
-- Billing CFDI: line items + tax breakdown for proposals & invoices
-- Generated: 2026-06-08
-- Additive only. Replicates the 1640 quote/invoice model on Supabase.
-- ============================================================

-- ── proposals: CFDI fields ───────────────────────────────────────────────────
-- `items` (jsonb) already exists. Each item is a QuoteLine snapshot:
--   { id, category, name, description?, unitPrice, qty, unit, isRequired? }
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS subtotal    numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax         jsonb,                       -- TaxBreakdown: { subtotal, iva, retIsr?, retIva?, total }
  ADD COLUMN IF NOT EXISTS client_type text          NOT NULL DEFAULT 'DIRECTO'
                             CHECK (client_type IN ('DIRECTO','EMPRESA')),
  ADD COLUMN IF NOT EXISTS fiscal_data jsonb;                       -- FiscalData (solo EMPRESA)

-- ── invoices: line items + CFDI ──────────────────────────────────────────────
-- `amount` se mantiene como gran total (compatibilidad). Se agregan conceptos
-- por línea y el desglose fiscal para facturas CFDI completas.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS items       jsonb         NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS subtotal    numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax         jsonb,
  ADD COLUMN IF NOT EXISTS client_type text          NOT NULL DEFAULT 'DIRECTO'
                             CHECK (client_type IN ('DIRECTO','EMPRESA')),
  ADD COLUMN IF NOT EXISTS fiscal_data jsonb,
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoices_proposal_id_idx ON public.invoices (proposal_id);
