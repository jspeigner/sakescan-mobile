-- Phase 4: menu price history (RPC) + scan confirm/wrong telemetry

ALTER TABLE public.menu_scans
  ADD COLUMN IF NOT EXISTS city TEXT NULL;

-- Anonymized recent menu prices for a catalog sake (cross-user; no user_id leaked).
CREATE OR REPLACE FUNCTION public.get_menu_prices_for_sake(
  p_sake_id uuid,
  p_limit integer DEFAULT 8
)
RETURNS TABLE (
  price text,
  size text,
  city text,
  seen_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    msi.price,
    msi.size,
    ms.city,
    msi.created_at AS seen_at
  FROM public.menu_scan_items msi
  JOIN public.menu_scans ms ON ms.id = msi.menu_scan_id
  WHERE msi.sake_id = p_sake_id
    AND msi.price IS NOT NULL
    AND trim(msi.price) <> ''
  ORDER BY msi.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 8), 20));
$$;

GRANT EXECUTE ON FUNCTION public.get_menu_prices_for_sake(uuid, integer) TO anon, authenticated;

-- Confirm / Wrong sake feedback (authenticated client insert; guests stay local-only).
CREATE TABLE IF NOT EXISTS public.scan_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('confirm', 'wrong')),
  sake_id UUID NULL REFERENCES public.sake(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  brewery TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_feedback_created_at
  ON public.scan_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_feedback_kind
  ON public.scan_feedback(kind);
CREATE INDEX IF NOT EXISTS idx_scan_feedback_sake_id
  ON public.scan_feedback(sake_id);

ALTER TABLE public.scan_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scan_feedback_service_role_all" ON public.scan_feedback;
DROP POLICY IF EXISTS "scan_feedback_owner_insert" ON public.scan_feedback;
DROP POLICY IF EXISTS "scan_feedback_owner_select" ON public.scan_feedback;

CREATE POLICY "scan_feedback_service_role_all"
  ON public.scan_feedback
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "scan_feedback_owner_insert"
  ON public.scan_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scan_feedback_owner_select"
  ON public.scan_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.scan_feedback TO authenticated;
GRANT ALL ON public.scan_feedback TO service_role;
