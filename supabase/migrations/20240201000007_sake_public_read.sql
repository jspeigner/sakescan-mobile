-- Ensure sake table allows public read access (anon + authenticated)
-- The app uses anon key for Explore tab - without this policy, RLS blocks the query

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "sake_select_policy" ON public.sake;
DROP POLICY IF EXISTS "Allow public read access on sake" ON public.sake;
DROP POLICY IF EXISTS "Users can view sake" ON public.sake;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sake;

-- Allow anyone to read sake (catalog is public)
CREATE POLICY "sake_public_read"
ON public.sake
FOR SELECT
TO anon, authenticated
USING (true);
