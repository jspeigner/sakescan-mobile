-- SakeScan social: follows, activity feed, comments, notifications, blocks, reports
-- Public profiles in v1 (no private follow-requests yet)

-- Profile extras
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS activity_public BOOLEAN NOT NULL DEFAULT TRUE;

-- Allow authenticated users to read public profile fields of others
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view public profiles" ON public.users;
CREATE POLICY "Users can view public profiles"
  ON public.users FOR SELECT
  TO anon, authenticated
  USING (true);

-- Follows
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_select" ON public.follows;
DROP POLICY IF EXISTS "follows_insert" ON public.follows;
DROP POLICY IF EXISTS "follows_delete" ON public.follows;

CREATE POLICY "follows_select" ON public.follows
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "follows_insert" ON public.follows
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete" ON public.follows
  FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

GRANT SELECT ON public.follows TO anon, authenticated;
GRANT INSERT, DELETE ON public.follows TO authenticated;

-- Activity events
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('scan', 'rating', 'favorite', 'menu_share')),
  sake_id UUID NULL REFERENCES public.sake(id) ON DELETE SET NULL,
  rating_id UUID NULL REFERENCES public.ratings(id) ON DELETE SET NULL,
  scan_id UUID NULL REFERENCES public.scans(id) ON DELETE SET NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_actor_created ON public.activity_events(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_sake ON public.activity_events(sake_id);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_select" ON public.activity_events;
DROP POLICY IF EXISTS "activity_insert" ON public.activity_events;
DROP POLICY IF EXISTS "activity_update" ON public.activity_events;
DROP POLICY IF EXISTS "activity_delete" ON public.activity_events;

-- Visible if public, own, or viewer follows actor (and not blocked)
CREATE POLICY "activity_select" ON public.activity_events
  FOR SELECT TO authenticated, anon
  USING (
    is_public = TRUE
    OR actor_id = auth.uid()
    OR (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = auth.uid() AND f.following_id = activity_events.actor_id
      )
    )
  );

CREATE POLICY "activity_insert" ON public.activity_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "activity_update" ON public.activity_events
  FOR UPDATE TO authenticated
  USING (auth.uid() = actor_id)
  WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "activity_delete" ON public.activity_events
  FOR DELETE TO authenticated
  USING (auth.uid() = actor_id);

GRANT SELECT ON public.activity_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.activity_events TO authenticated;

-- Comments on activity
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activity_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_activity ON public.comments(activity_id, created_at ASC);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_update" ON public.comments;
DROP POLICY IF EXISTS "comments_delete" ON public.comments;

CREATE POLICY "comments_select" ON public.comments
  FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_events ae
      WHERE ae.id = comments.activity_id
        AND (
          ae.is_public = TRUE
          OR ae.actor_id = auth.uid()
          OR (
            auth.uid() IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.follows f
              WHERE f.follower_id = auth.uid() AND f.following_id = ae.actor_id
            )
          )
        )
    )
  );

CREATE POLICY "comments_insert" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update" ON public.comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete" ON public.comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;

-- In-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('follow', 'comment', 'mention')),
  activity_id UUID NULL REFERENCES public.activity_events(id) ON DELETE SET NULL,
  comment_id UUID NULL REFERENCES public.comments(id) ON DELETE SET NULL,
  body TEXT NOT NULL DEFAULT '',
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Inserts via SECURITY DEFINER helpers / triggers
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO authenticated;

-- Blocks
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocks_no_self CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocks_select" ON public.blocks;
DROP POLICY IF EXISTS "blocks_insert" ON public.blocks;
DROP POLICY IF EXISTS "blocks_delete" ON public.blocks;

CREATE POLICY "blocks_select" ON public.blocks
  FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "blocks_insert" ON public.blocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocks_delete" ON public.blocks
  FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;

-- Reports (App Store social compliance)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'activity', 'comment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) > 0 AND char_length(reason) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_created ON public.reports(created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert" ON public.reports;
DROP POLICY IF EXISTS "reports_select_own" ON public.reports;

CREATE POLICY "reports_insert" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

GRANT INSERT, SELECT ON public.reports TO authenticated;

-- Home feed RPC (cursor = created_at of last item)
CREATE OR REPLACE FUNCTION public.get_home_feed(
  p_limit INT DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  actor_id UUID,
  type TEXT,
  sake_id UUID,
  rating_id UUID,
  scan_id UUID,
  meta JSONB,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  actor_display_name TEXT,
  actor_avatar_url TEXT,
  sake_name TEXT,
  sake_brewery TEXT,
  sake_type TEXT,
  sake_image_url TEXT,
  rating_value NUMERIC,
  review_text TEXT,
  comment_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    ae.id,
    ae.actor_id,
    ae.type,
    ae.sake_id,
    ae.rating_id,
    ae.scan_id,
    ae.meta,
    ae.is_public,
    ae.created_at,
    u.display_name AS actor_display_name,
    u.avatar_url AS actor_avatar_url,
    s.name AS sake_name,
    s.brewery AS sake_brewery,
    s.type AS sake_type,
    s.image_url AS sake_image_url,
    r.rating AS rating_value,
    r.review_text,
    (SELECT COUNT(*) FROM public.comments c WHERE c.activity_id = ae.id) AS comment_count
  FROM public.activity_events ae
  JOIN public.users u ON u.id = ae.actor_id
  LEFT JOIN public.sake s ON s.id = ae.sake_id
  LEFT JOIN public.ratings r ON r.id = ae.rating_id
  WHERE
    (p_cursor IS NULL OR ae.created_at < p_cursor)
    AND (
      -- Following feed
      (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.follower_id = auth.uid() AND f.following_id = ae.actor_id
        )
      )
      -- Or public discover slice
      OR ae.is_public = TRUE
    )
    AND (
      auth.uid() IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = ae.actor_id)
           OR (b.blocker_id = ae.actor_id AND b.blocked_id = auth.uid())
      )
    )
  ORDER BY ae.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
$$;

GRANT EXECUTE ON FUNCTION public.get_home_feed(INT, TIMESTAMPTZ) TO anon, authenticated;

-- Notify on follow
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, body)
  VALUES (
    NEW.following_id,
    NEW.follower_id,
    'follow',
    'started following you'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;
CREATE TRIGGER trg_notify_on_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Notify on comment
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_sake TEXT;
BEGIN
  SELECT ae.actor_id, s.name INTO v_actor, v_sake
  FROM public.activity_events ae
  LEFT JOIN public.sake s ON s.id = ae.sake_id
  WHERE ae.id = NEW.activity_id;

  IF v_actor IS NOT NULL AND v_actor <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, activity_id, comment_id, body)
    VALUES (
      v_actor,
      NEW.user_id,
      'comment',
      NEW.activity_id,
      NEW.id,
      COALESCE('commented on your activity' || CASE WHEN v_sake IS NOT NULL THEN ' about ' || v_sake ELSE '' END, 'commented')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
