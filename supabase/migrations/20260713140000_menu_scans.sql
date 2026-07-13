-- Menu scan sessions + line items (Phase 2)

CREATE TABLE IF NOT EXISTS public.menu_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_flavors TEXT[] DEFAULT '{}',
  budget_bias TEXT,
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.menu_scan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_scan_id UUID NOT NULL REFERENCES public.menu_scans(id) ON DELETE CASCADE,
  sake_id UUID REFERENCES public.sake(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_japanese TEXT,
  brewery TEXT,
  type TEXT,
  price TEXT,
  size TEXT,
  description TEXT,
  tasting_notes TEXT,
  flavor_profile TEXT[] DEFAULT '{}',
  average_rating NUMERIC,
  recommendation_score INTEGER,
  recommendation_tier TEXT,
  recommendation_reasons TEXT[] DEFAULT '{}',
  value_label TEXT,
  value_chip TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_scans_user_id ON public.menu_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_scans_created_at ON public.menu_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_scan_items_menu_scan_id ON public.menu_scan_items(menu_scan_id);
CREATE INDEX IF NOT EXISTS idx_menu_scan_items_sake_id ON public.menu_scan_items(sake_id);

ALTER TABLE public.menu_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_scan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own menu scans" ON public.menu_scans;
DROP POLICY IF EXISTS "Users can insert their own menu scans" ON public.menu_scans;
DROP POLICY IF EXISTS "Users can delete their own menu scans" ON public.menu_scans;

CREATE POLICY "Users can view their own menu scans"
  ON public.menu_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own menu scans"
  ON public.menu_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own menu scans"
  ON public.menu_scans FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own menu scan items" ON public.menu_scan_items;
DROP POLICY IF EXISTS "Users can insert their own menu scan items" ON public.menu_scan_items;
DROP POLICY IF EXISTS "Users can delete their own menu scan items" ON public.menu_scan_items;

CREATE POLICY "Users can view their own menu scan items"
  ON public.menu_scan_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_scans ms
      WHERE ms.id = menu_scan_id AND ms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own menu scan items"
  ON public.menu_scan_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_scans ms
      WHERE ms.id = menu_scan_id AND ms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own menu scan items"
  ON public.menu_scan_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_scans ms
      WHERE ms.id = menu_scan_id AND ms.user_id = auth.uid()
    )
  );

GRANT ALL ON public.menu_scans TO authenticated;
GRANT ALL ON public.menu_scan_items TO authenticated;
GRANT SELECT ON public.menu_scans TO anon;
GRANT SELECT ON public.menu_scan_items TO anon;
