-- Unified sake image column + breweries catalog RPC (mobile reads `image_url` only).

ALTER TABLE public.sake ADD COLUMN IF NOT EXISTS image_url text;

-- One-time backfill when legacy columns still exist (safe no-op if already dropped).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sake' AND column_name = 'label_image_url'
  ) THEN
    UPDATE public.sake s
    SET image_url = COALESCE(
      NULLIF(trim(s.image_url), ''),
      NULLIF(trim(s.label_image_url), ''),
      NULLIF(trim(s.bottle_image_url), '')
    )
    WHERE s.image_url IS NULL OR trim(COALESCE(s.image_url, '')) = '';
  END IF;
END $$;

-- Drop first: PG does not allow changing RETURNS TABLE column names via CREATE OR REPLACE alone.

DROP FUNCTION IF EXISTS public.list_breweries_catalog(integer, integer);

CREATE FUNCTION public.list_breweries_catalog(
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  name text,
  region text,
  sake_count bigint,
  avg_rating numeric,
  thumbnail_image_url text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH agg AS (
    SELECT
      s.brewery AS brewery,
      COUNT(*)::bigint AS sake_count,
      AVG(s.average_rating) FILTER (WHERE s.average_rating IS NOT NULL) AS avg_rating,
      COALESCE(
        MAX(NULLIF(trim(s.region), '')),
        MAX(NULLIF(trim(s.prefecture), '')),
        'Japan'
      ) AS region
    FROM public.sake s
    GROUP BY s.brewery
  ),
  top_img AS (
    SELECT DISTINCT ON (s.brewery)
      s.brewery AS brewery,
      NULLIF(trim(s.image_url), '') AS thumb
    FROM public.sake s
    WHERE NULLIF(trim(s.image_url), '') IS NOT NULL
    ORDER BY s.brewery, s.average_rating DESC NULLS LAST, s.name ASC
  )
  SELECT
    a.brewery::text AS name,
    a.region::text,
    a.sake_count,
    a.avg_rating,
    t.thumb::text AS thumbnail_image_url
  FROM agg a
  LEFT JOIN top_img t ON t.brewery = a.brewery
  ORDER BY a.sake_count DESC, a.brewery ASC
  LIMIT COALESCE(NULLIF(p_limit, 0), 30)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

GRANT EXECUTE ON FUNCTION public.list_breweries_catalog(integer, integer) TO anon, authenticated;
