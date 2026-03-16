-- Fix ratings table
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sake_id UUID NOT NULL REFERENCES public.sake(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sake_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON public.ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_sake_id ON public.ratings(sake_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON public.ratings(created_at DESC);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.ratings;

CREATE POLICY "Users can view all ratings" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert their own ratings" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ratings" ON public.ratings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ratings" ON public.ratings FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT ON public.ratings TO anon;
GRANT ALL ON public.ratings TO authenticated;

CREATE OR REPLACE FUNCTION public.update_sake_ratings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sake SET
    average_rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.ratings WHERE sake_id = COALESCE(NEW.sake_id, OLD.sake_id)),
    total_ratings = (SELECT COUNT(*) FROM public.ratings WHERE sake_id = COALESCE(NEW.sake_id, OLD.sake_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.sake_id, OLD.sake_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_sake_ratings_on_insert ON public.ratings;
DROP TRIGGER IF EXISTS update_sake_ratings_on_update ON public.ratings;
DROP TRIGGER IF EXISTS update_sake_ratings_on_delete ON public.ratings;
CREATE TRIGGER update_sake_ratings_on_insert AFTER INSERT ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_sake_ratings();
CREATE TRIGGER update_sake_ratings_on_update AFTER UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_sake_ratings();
CREATE TRIGGER update_sake_ratings_on_delete AFTER DELETE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_sake_ratings();
