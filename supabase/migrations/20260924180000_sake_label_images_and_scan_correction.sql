-- Back-label correction + label image catalog for stronger future matches

-- Front/back label photos linked to a catalog sake (built from confirmed corrections)
CREATE TABLE IF NOT EXISTS public.sake_label_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sake_id UUID NOT NULL REFERENCES public.sake(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('front', 'back')),
  storage_path TEXT NOT NULL,
  source_scan_id UUID NULL REFERENCES public.scans(id) ON DELETE SET NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sake_label_images_sake_id
  ON public.sake_label_images(sake_id);
CREATE INDEX IF NOT EXISTS idx_sake_label_images_side
  ON public.sake_label_images(sake_id, side);

ALTER TABLE public.sake_label_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sake_label_images_service_role_all" ON public.sake_label_images;
DROP POLICY IF EXISTS "sake_label_images_select_authenticated" ON public.sake_label_images;
DROP POLICY IF EXISTS "sake_label_images_insert_own" ON public.sake_label_images;

CREATE POLICY "sake_label_images_service_role_all"
  ON public.sake_label_images
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "sake_label_images_select_authenticated"
  ON public.sake_label_images
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "sake_label_images_insert_own"
  ON public.sake_label_images
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

GRANT SELECT, INSERT ON public.sake_label_images TO authenticated;
GRANT ALL ON public.sake_label_images TO service_role;

-- Scans: keep front on scanned_image_url; add optional back image
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS back_image_url TEXT NULL;

-- Scan feedback: richer wrong → corrected trail
ALTER TABLE public.scan_feedback
  ADD COLUMN IF NOT EXISTS corrected_sake_id UUID NULL REFERENCES public.sake(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scan_id UUID NULL REFERENCES public.scans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS front_image_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS back_image_url TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_scan_feedback_corrected_sake_id
  ON public.scan_feedback(corrected_sake_id)
  WHERE corrected_sake_id IS NOT NULL;

COMMENT ON TABLE public.sake_label_images IS
  'Confirmed front/back label photos for catalog sake — used to strengthen future matches without always calling Vision.';
