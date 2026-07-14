-- Menu scan monthly quota for Free tier (Pro bypass is client-side via RevenueCat)

CREATE OR REPLACE FUNCTION public.get_menu_scan_quota()
RETURNS TABLE (
  used BIGINT,
  limit_count INT,
  month_start TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH bounds AS (
    SELECT date_trunc('month', (now() AT TIME ZONE 'utc')) AT TIME ZONE 'utc' AS month_start
  )
  SELECT
    (
      SELECT COUNT(*)::BIGINT
      FROM public.menu_scans ms
      WHERE ms.user_id = auth.uid()
        AND ms.created_at >= (SELECT month_start FROM bounds)
    ) AS used,
    3::INT AS limit_count,
    (SELECT month_start FROM bounds) AS month_start;
$$;

GRANT EXECUTE ON FUNCTION public.get_menu_scan_quota() TO authenticated;

COMMENT ON FUNCTION public.get_menu_scan_quota() IS
  'Returns Free-tier menu scan usage for the current UTC month. Pro entitlement is enforced client-side via RevenueCat.';
