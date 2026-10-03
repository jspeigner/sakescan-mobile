-- Exclude placeholder / missing brewery names from the Breweries catalog.
-- "Unknown" was dominating Featured with tens of thousands of unlabeled rows.

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
  WITH known_sake AS (
    SELECT s.*
    FROM public.sake s
    WHERE NULLIF(trim(s.brewery), '') IS NOT NULL
      AND lower(trim(s.brewery)) NOT IN (
        'unknown',
        'unknown brewery',
        'n/a',
        'na',
        'none',
        'not specified',
        'unspecified',
        'not listed',
        'not available'
      )
  ),
  agg AS (
    SELECT
      ks.brewery AS brewery,
      COUNT(*)::bigint AS sake_count,
      AVG(ks.average_rating) FILTER (WHERE ks.average_rating IS NOT NULL) AS avg_rating,
      COALESCE(
        MAX(NULLIF(trim(ks.region), '')),
        MAX(NULLIF(trim(ks.prefecture), '')),
        'Japan'
      ) AS region
    FROM known_sake ks
    GROUP BY ks.brewery
  ),
  top_img AS (
    SELECT DISTINCT ON (ks.brewery)
      ks.brewery AS brewery,
      NULLIF(trim(ks.image_url), '') AS thumb
    FROM known_sake ks
    WHERE NULLIF(trim(ks.image_url), '') IS NOT NULL
    ORDER BY ks.brewery, ks.average_rating DESC NULLS LAST, ks.name ASC
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

COMMENT ON FUNCTION public.list_breweries_catalog(integer, integer) IS
  'Paginated brewery catalog ordered by sake_count DESC. Omits empty/Unknown brewery placeholders.';
