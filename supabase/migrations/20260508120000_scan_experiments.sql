-- scan_experiments: telemetry for the WineEngine vs OpenAI label-scan cascade.
-- Each row represents one scan request to the scan-label-v2 edge function.
-- Service role writes (from edge function); admins can read for analysis.

CREATE TABLE IF NOT EXISTS public.scan_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 'wineengine' (matched + confident, no fallback)
  -- 'openai' (WineEngine missed/low-confidence, OpenAI succeeded)
  -- 'wineengine+openai' (WineEngine matched but OpenAI also ran for some reason)
  -- 'none' (both providers failed)
  provider_used TEXT NOT NULL,

  wineengine_score DOUBLE PRECISION NULL,
  wineengine_match_percent DOUBLE PRECISION NULL,
  wineengine_text_tokens TEXT[] NULL,
  wineengine_filepath TEXT NULL,

  openai_used BOOLEAN NOT NULL DEFAULT FALSE,

  latency_ms_we INTEGER NULL,
  latency_ms_oai INTEGER NULL,

  matched_sake_id UUID NULL REFERENCES public.sake(id) ON DELETE SET NULL,

  error TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_experiments_created_at
  ON public.scan_experiments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_experiments_provider
  ON public.scan_experiments(provider_used);
CREATE INDEX IF NOT EXISTS idx_scan_experiments_user_id
  ON public.scan_experiments(user_id);

ALTER TABLE public.scan_experiments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scan_experiments_service_role_all" ON public.scan_experiments;
DROP POLICY IF EXISTS "scan_experiments_owner_select" ON public.scan_experiments;

-- Edge function uses service role; this policy lets it write/read freely.
CREATE POLICY "scan_experiments_service_role_all"
  ON public.scan_experiments
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Authenticated users can see only their own scan rows (useful for in-app history later).
CREATE POLICY "scan_experiments_owner_select"
  ON public.scan_experiments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_experiments TO service_role;
GRANT SELECT ON public.scan_experiments TO authenticated;
