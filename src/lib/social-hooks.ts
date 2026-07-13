import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from './supabase';

export type ActivityType = 'scan' | 'rating' | 'favorite' | 'menu_share';

export interface FeedItem {
  id: string;
  actor_id: string;
  type: ActivityType;
  sake_id: string | null;
  rating_id: string | null;
  scan_id: string | null;
  meta: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  sake_name: string | null;
  sake_brewery: string | null;
  sake_type: string | null;
  sake_image_url: string | null;
  rating_value: number | null;
  review_text: string | null;
  comment_count: number;
}

export interface ActivityComment {
  id: string;
  activity_id: string;
  user_id: string;
  body: string;
  created_at: string;
  users?: { display_name: string | null; avatar_url: string | null } | null;
}

export function isSocialEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_SOCIAL_ENABLED?.trim().toLowerCase() ?? '1';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

async function getActivityPublic(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('activity_public')
    .eq('id', userId)
    .maybeSingle();
  return data?.activity_public !== false;
}

/** Emit a public/private activity event for the feed. */
export async function emitActivityEvent(params: {
  actorId: string;
  type: ActivityType;
  sakeId?: string | null;
  ratingId?: string | null;
  scanId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const isPublic = await getActivityPublic(params.actorId);
    const { error } = await supabase.from('activity_events').insert({
      actor_id: params.actorId,
      type: params.type,
      sake_id: params.sakeId ?? null,
      rating_id: params.ratingId ?? null,
      scan_id: params.scanId ?? null,
      meta: params.meta ?? {},
      is_public: isPublic,
    } as Record<string, unknown>);
    if (error) console.warn('emitActivityEvent failed:', error.message);
  } catch (err) {
    console.warn('emitActivityEvent exception:', err);
  }
}

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['social', 'profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, bio, activity_public, created_at')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && isSocialEnabled(),
  });
}

export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ['social', 'followCounts', userId],
    queryFn: async () => {
      if (!userId) return { followers: 0, following: 0 };
      const [followers, following] = await Promise.all([
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId),
      ]);
      return {
        followers: followers.count ?? 0,
        following: following.count ?? 0,
      };
    },
    enabled: !!userId && isSocialEnabled(),
  });
}

export function useIsFollowing(viewerId: string | undefined, targetId: string | undefined) {
  return useQuery({
    queryKey: ['social', 'isFollowing', viewerId, targetId],
    queryFn: async () => {
      if (!viewerId || !targetId || viewerId === targetId) return false;
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', viewerId)
        .eq('following_id', targetId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!viewerId && !!targetId && viewerId !== targetId && isSocialEnabled(),
  });
}

export function useFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { followerId: string; followingId: string }) => {
      if (params.followerId === params.followingId) throw new Error('Cannot follow yourself');
      const { error } = await supabase.from('follows').insert({
        follower_id: params.followerId,
        following_id: params.followingId,
      } as Record<string, unknown>);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['social', 'isFollowing', v.followerId, v.followingId] });
      queryClient.invalidateQueries({ queryKey: ['social', 'followCounts', v.followingId] });
      queryClient.invalidateQueries({ queryKey: ['social', 'followCounts', v.followerId] });
      queryClient.invalidateQueries({ queryKey: ['social', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['social', 'followers', v.followingId] });
    },
  });
}

export function useUnfollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { followerId: string; followingId: string }) => {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', params.followerId)
        .eq('following_id', params.followingId);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['social', 'isFollowing', v.followerId, v.followingId] });
      queryClient.invalidateQueries({ queryKey: ['social', 'followCounts', v.followingId] });
      queryClient.invalidateQueries({ queryKey: ['social', 'followCounts', v.followerId] });
      queryClient.invalidateQueries({ queryKey: ['social', 'feed'] });
    },
  });
}

export function useFollowList(userId: string | undefined, mode: 'followers' | 'following') {
  return useQuery({
    queryKey: ['social', mode, userId],
    queryFn: async () => {
      if (!userId) return [];
      if (mode === 'followers') {
        const { data, error } = await supabase
          .from('follows')
          .select('follower_id, created_at, users:follower_id(id, display_name, avatar_url)')
          .eq('following_id', userId)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        return (data ?? []).map((row) => {
          const users = row.users as
            | { id: string; display_name: string | null; avatar_url: string | null }
            | { id: string; display_name: string | null; avatar_url: string | null }[]
            | null;
          const user = Array.isArray(users) ? users[0] ?? null : users;
          return {
            id: row.follower_id as string,
            created_at: row.created_at as string,
            user,
          };
        });
      }
      const { data, error } = await supabase
        .from('follows')
        .select('following_id, created_at, users:following_id(id, display_name, avatar_url)')
        .eq('follower_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const users = row.users as
          | { id: string; display_name: string | null; avatar_url: string | null }
          | { id: string; display_name: string | null; avatar_url: string | null }[]
          | null;
        const user = Array.isArray(users) ? users[0] ?? null : users;
        return {
          id: row.following_id as string,
          created_at: row.created_at as string,
          user,
        };
      });
    },
    enabled: !!userId && isSocialEnabled(),
  });
}

export function useUserActivity(userId: string | undefined, limit = 30) {
  return useQuery({
    queryKey: ['social', 'userActivity', userId, limit],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('activity_events')
        .select(
          `
          id, actor_id, type, sake_id, rating_id, scan_id, meta, is_public, created_at,
          sake:sake_id(id, name, brewery, type, image_url)
        `,
        )
        .eq('actor_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId && isSocialEnabled(),
  });
}

export function useHomeFeed() {
  return useInfiniteQuery({
    queryKey: ['social', 'feed'],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const { data, error } = await supabase.rpc('get_home_feed', {
        p_limit: 20,
        p_cursor: pageParam,
      });
      if (error) throw error;
      return (data ?? []) as FeedItem[];
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (!lastPage.length || lastPage.length < 20) return undefined;
      return lastPage[lastPage.length - 1]?.created_at ?? undefined;
    },
    enabled: isSocialEnabled(),
  });
}

export function useActivityComments(activityId: string | undefined) {
  return useQuery({
    queryKey: ['social', 'comments', activityId],
    queryFn: async () => {
      if (!activityId) return [];
      const { data, error } = await supabase
        .from('comments')
        .select('id, activity_id, user_id, body, created_at, users:user_id(display_name, avatar_url)')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const users = row.users as
          | { display_name: string | null; avatar_url: string | null }
          | { display_name: string | null; avatar_url: string | null }[]
          | null;
        return {
          id: row.id as string,
          activity_id: row.activity_id as string,
          user_id: row.user_id as string,
          body: row.body as string,
          created_at: row.created_at as string,
          users: Array.isArray(users) ? users[0] ?? null : users,
        } satisfies ActivityComment;
      });
    },
    enabled: !!activityId && isSocialEnabled(),
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { activityId: string; userId: string; body: string }) => {
      const trimmed = params.body.trim();
      if (!trimmed) throw new Error('Comment cannot be empty');
      if (trimmed.length > 1000) throw new Error('Comment is too long');
      const { data, error } = await supabase
        .from('comments')
        .insert({
          activity_id: params.activityId,
          user_id: params.userId,
          body: trimmed,
        } as Record<string, unknown>)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['social', 'comments', v.activityId] });
      queryClient.invalidateQueries({ queryKey: ['social', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['social', 'notifications'] });
    },
  });
}

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['social', 'notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select(
          'id, user_id, actor_id, type, activity_id, comment_id, body, read_at, created_at, actor:actor_id(display_name, avatar_url)',
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId && isSocialEnabled(),
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('user_id', userId)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['social', 'notifications', userId] });
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { blockerId: string; blockedId: string }) => {
      const { error } = await supabase.from('blocks').insert({
        blocker_id: params.blockerId,
        blocked_id: params.blockedId,
      } as Record<string, unknown>);
      if (error) throw error;
      // Also unfollow both directions
      await supabase
        .from('follows')
        .delete()
        .or(
          `and(follower_id.eq.${params.blockerId},following_id.eq.${params.blockedId}),and(follower_id.eq.${params.blockedId},following_id.eq.${params.blockerId})`,
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

export function useReportContent() {
  return useMutation({
    mutationFn: async (params: {
      reporterId: string;
      targetType: 'user' | 'activity' | 'comment';
      targetId: string;
      reason: string;
    }) => {
      const { error } = await supabase.from('reports').insert({
        reporter_id: params.reporterId,
        target_type: params.targetType,
        target_id: params.targetId,
        reason: params.reason.trim().slice(0, 500),
      } as Record<string, unknown>);
      if (error) throw error;
    },
  });
}

export function useUpdateActivityPrivacy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { userId: string; activityPublic: boolean }) => {
      const { error: userErr } = await supabase
        .from('users')
        .update({ activity_public: params.activityPublic } as Record<string, unknown>)
        .eq('id', params.userId);
      if (userErr) throw userErr;
      // Sync existing events visibility
      const { error: actErr } = await supabase
        .from('activity_events')
        .update({ is_public: params.activityPublic } as Record<string, unknown>)
        .eq('actor_id', params.userId);
      if (actErr) throw actErr;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['social', 'profile', v.userId] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', v.userId] });
      queryClient.invalidateQueries({ queryKey: ['social', 'feed'] });
    },
  });
}

export function useSuggestedUsers(userId: string | undefined, limit = 8) {
  return useQuery({
    queryKey: ['social', 'suggested', userId, limit],
    queryFn: async () => {
      // Public users with recent activity, excluding self and already-followed
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, bio')
        .neq('id', userId ?? '00000000-0000-0000-0000-000000000000')
        .order('updated_at', { ascending: false })
        .limit(limit * 3);
      if (error) throw error;
      if (!userId) return (data ?? []).slice(0, limit);

      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);
      const followingSet = new Set((following ?? []).map((f) => f.following_id));
      return (data ?? []).filter((u) => !followingSet.has(u.id)).slice(0, limit);
    },
    enabled: isSocialEnabled(),
  });
}
