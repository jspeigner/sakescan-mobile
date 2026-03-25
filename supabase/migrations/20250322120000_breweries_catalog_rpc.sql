-- Paginated brewery list derived from full public.sake catalog (grouped by brewery).
-- Used by the mobile Breweries tab; respects RLS via SECURITY INVOKER.

CREATE OR REPLACE FUNCTION public.list_breweries_catalog(
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  name text,
  region text,
  sake_count bigint,
  avg_rating numeric,
  thumbnail_label_url text
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
      COALESCE(
        NULLIF(trim(s.label_image_url), ''),
        NULLIF(trim(s.bottle_image_url), '')
      ) AS thumb
    FROM public.sake s
    WHERE COALESCE(
        NULLIF(trim(s.label_image_url), ''),
        NULLIF(trim(s.bottle_image_url), '')
      ) IS NOT NULL
    ORDER BY s.brewery, s.average_rating DESC NULLS LAST, s.name ASC
  )
  SELECT
    a.brewery::text AS name,
    a.region::text,
    a.sake_count,
    a.avg_rating,
    t.thumb::text AS thumbnail_label_url
  FROM agg a
  LEFT JOIN top_img t ON t.brewery = a.brewery
  ORDER BY a.sake_count DESC, a.brewery ASC
  LIMIT COALESCE(NULLIF(p_limit, 0), 30)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

GRANT EXECUTE ON FUNCTION public.list_breweries_catalog(integer, integer) TO anon, authenticated;
