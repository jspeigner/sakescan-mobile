-- Self-service account deletion for authenticated users (QA B02).
-- Prefer this RPC over the delete-user Edge Function so clients do not depend on a deploy.
-- Safe to re-run: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Best-effort cleanup of app data (FKs may already cascade)
  DELETE FROM public.scans WHERE user_id = uid;
  DELETE FROM public.ratings WHERE user_id = uid;
  DELETE FROM public.favorites WHERE user_id = uid;

  BEGIN
    DELETE FROM public.follows WHERE follower_id = uid OR following_id = uid;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM public.activity_comments WHERE user_id = uid;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM public.activity_likes WHERE user_id = uid;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM public.activities WHERE user_id = uid;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM public.reports WHERE reporter_id = uid;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM public.menu_scans WHERE user_id = uid;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  DELETE FROM public.users WHERE id = uid;

  -- Remove auth user (requires security definer on auth schema)
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

COMMENT ON FUNCTION public.delete_own_account() IS
  'Deletes the calling user''s app data and auth.users row. Used by Profile → Delete Account.';
