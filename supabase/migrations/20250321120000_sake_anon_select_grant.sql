-- PostgREST uses role `anon` for the anon key. Without SELECT grant, queries fail with
-- "permission denied for table sake" even if RLS policies exist.

ALTER TABLE public.sake ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.sake TO anon, authenticated;

DROP POLICY IF EXISTS "sake_public_read" ON public.sake;
CREATE POLICY "sake_public_read"
ON public.sake
FOR SELECT
TO anon, authenticated
USING (true);
