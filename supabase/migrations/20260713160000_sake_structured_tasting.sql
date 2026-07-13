-- Phase 3A: structured tasting fields on sake (additive; description markdown remains fallback)
ALTER TABLE public.sake
  ADD COLUMN IF NOT EXISTS flavor_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tasting_notes TEXT,
  ADD COLUMN IF NOT EXISTS food_pairings TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS serving_temps TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.sake.flavor_tags IS 'Structured flavor tags (e.g. Crisp, Fruity); preferred over description markdown';
COMMENT ON COLUMN public.sake.tasting_notes IS 'Structured tasting narrative; preferred over description markdown';
COMMENT ON COLUMN public.sake.food_pairings IS 'Structured food pairing list';
COMMENT ON COLUMN public.sake.serving_temps IS 'Structured serving temperatures (Chilled, Room, Warm, etc.)';
