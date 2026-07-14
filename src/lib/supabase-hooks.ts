import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import type {
  Sake,
  Rating,
  User,
  ScanWithSake,
  RatingWithUser,
  RatingWithSake,
  ScanLabelResponse,
  FavoriteWithSake,
  BreweryCatalogRow,
  MenuPriceSighting,
} from './database.types';

// ============ SAKE QUERIES ============

export function useSakeList(options?: { limit?: number; offset?: number }) {
  const { limit = 50, offset = 0 } = options ?? {};

  return useQuery({
    queryKey: ['sake', 'list', limit, offset],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('sake')
        .select('*', { count: 'exact' })
        .order('average_rating', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { data: data as Sake[], count };
    },
  });
}

export function useSake(id: string | undefined) {
  return useQuery({
    queryKey: ['sake', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('sake')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Sake;
    },
    enabled: !!id,
  });
}

export function useSearchSake(query: string) {
  return useQuery({
    queryKey: ['sake', 'search', query],
    queryFn: async () => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from('sake')
        .select('*')
        .or(`name.ilike.%${query}%,name_japanese.ilike.%${query}%,brewery.ilike.%${query}%`)
        .order('average_rating', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Sake[];
    },
    enabled: query.trim().length > 0,
  });
}

export function useSakeByType(type: string | null) {
  return useQuery({
    queryKey: ['sake', 'type', type],
    queryFn: async () => {
      if (!type) return [];

      const { data, error } = await supabase
        .from('sake')
        .select('*')
        .or(`type.ilike.%${type}%,subtype.ilike.%${type}%`)
        .order('average_rating', { ascending: false });

      if (error) throw error;
      return data as Sake[];
    },
    enabled: !!type,
  });
}

export function useSakeByRegion(region: string | null) {
  return useQuery({
    queryKey: ['sake', 'region', region],
    queryFn: async () => {
      if (!region) return [];

      const { data, error } = await supabase
        .from('sake')
        .select('*')
        .or(`region.ilike.%${region}%,prefecture.ilike.%${region}%`)
        .order('average_rating', { ascending: false });

      if (error) throw error;
      return data as Sake[];
    },
    enabled: !!region,
  });
}

/** Page size for Breweries tab — must match sensible default in `list_breweries_catalog`. */
export const BREWERIES_CATALOG_PAGE_SIZE = 30;

/**
 * Paginated breweries aggregated from the full `sake` table (Supabase RPC).
 * Ordered by sake count descending; uses keyset-stable sort for consistent paging.
 */
export function useBreweriesCatalog() {
  return useInfiniteQuery({
    queryKey: ['breweries', 'catalog', BREWERIES_CATALOG_PAGE_SIZE],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const { data, error } = await supabase.rpc('list_breweries_catalog', {
        p_limit: BREWERIES_CATALOG_PAGE_SIZE,
        p_offset: offset,
      });
      if (error) throw error;
      return (data ?? []) as BreweryCatalogRow[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < BREWERIES_CATALOG_PAGE_SIZE) return undefined;
      return allPages.reduce((sum, page) => sum + page.length, 0);
    },
  });
}

// ============ RATING QUERIES ============

export function useSakeRatings(sakeId: string | undefined) {
  return useQuery({
    queryKey: ['ratings', 'sake', sakeId],
    queryFn: async () => {
      if (!sakeId) return [];

      const { data, error } = await supabase
        .from('ratings')
        .select(`
          *,
          users:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('sake_id', sakeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RatingWithUser[];
    },
    enabled: !!sakeId,
  });
}

export function useUserRatings(userId: string | undefined) {
  return useQuery({
    queryKey: ['ratings', 'user', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('ratings')
        .select(`
          *,
          sake:sake_id (
            name,
            brewery,
            type,
            image_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RatingWithSake[];
    },
    enabled: !!userId,
  });
}

export function useCreateRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { userId: string; sakeId: string; rating: number; reviewText?: string }) => {
      const { data, error } = await supabase
        .from('ratings')
        .insert({
          user_id: params.userId,
          sake_id: params.sakeId,
          rating: params.rating,
          review_text: params.reviewText ?? null,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) throw error;
      return data as Rating;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ratings', 'sake', variables.sakeId] });
      queryClient.invalidateQueries({ queryKey: ['ratings', 'user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['sake', variables.sakeId] });
      void import('./social-hooks').then(({ emitActivityEvent }) =>
        emitActivityEvent({
          actorId: variables.userId,
          type: 'rating',
          sakeId: variables.sakeId,
          ratingId: data.id,
          meta: { rating: variables.rating },
        }),
      );
    },
  });
}

export function useUpdateRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { ratingId: string; rating: number; reviewText?: string; sakeId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('ratings')
        .update({
          rating: params.rating,
          review_text: params.reviewText ?? null,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', params.ratingId)
        .select()
        .single();

      if (error) throw error;
      return data as Rating;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ratings', 'sake', variables.sakeId] });
      queryClient.invalidateQueries({ queryKey: ['ratings', 'user', variables.userId] });
    },
  });
}

// ============ SCAN QUERIES ============

export function useAllScans(options?: { limit?: number }) {
  const { limit = 100 } = options ?? {};

  return useQuery({
    queryKey: ['scans', 'all', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scans')
        .select(`
          *,
          sake:sake_id (
            id,
            name,
            brewery,
            type,
            image_url,
            average_rating,
            tasting_notes,
            flavor_tags
          )
        `)
        .eq('matched', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}

export function useUserScans(userId: string | undefined) {
  return useQuery({
    queryKey: ['scans', 'user', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('scans')
        .select(`
          *,
          sake:sake_id (
            name,
            brewery,
            type,
            image_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ScanWithSake[];
    },
    enabled: !!userId,
  });
}

export function useScanLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { imageBase64: string }) => {
      // Get current session to ensure user is authenticated
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in to use the scan feature.');
      }

      console.log('Scanning with authenticated user token');
      console.log('User ID:', session.user?.id);

      // Use supabase.functions.invoke which handles auth automatically
      const { data, error } = await supabase.functions.invoke('scan-label', {
        body: { image_base64: params.imageBase64 },
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(error.message || 'Failed to scan label');
      }

      console.log('Edge Function success response:', data);
      return data as ScanLabelResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
    },
  });
}

/** Upload a local file URI to the sake-images bucket. Returns the storage path on success. */
async function uploadLabelImage(localUri: string, sakeId: string): Promise<string | null> {
  const path = `labels/${sakeId}-${Date.now()}.jpg`;
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = decode(base64);
  const { error } = await supabase.storage
    .from('sake-images')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
  if (error) {
    console.warn('Storage upload error:', error.message);
    return null;
  }
  return path;
}

export function useCreateSake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      nameJapanese?: string;
      brewery: string;
      type?: string;
      subtype?: string;
      prefecture?: string;
      region?: string;
      description?: string;
      riceVariety?: string;
      polishingRatio?: number;
      alcoholPercentage?: number;
      // Additional OpenAI extracted data
      tastingNotes?: string;
      foodPairings?: string[];
      flavorProfile?: string[];
      servingTemperature?: string[];
      // Label photo captured during scan
      imageUrl?: string;
    }) => {
      // Check if sake already exists (fuzzy — catalog names often differ slightly from scan text)
      const { data: existingRows } = await supabase
        .from('sake')
        .select('id, image_url, name, brewery')
        .or(`name.ilike.%${params.name}%,brewery.ilike.%${params.brewery}%`)
        .limit(8);

      const existing =
        existingRows?.find(
          (row) =>
            row.name?.toLowerCase().includes(params.name.toLowerCase()) ||
            params.name.toLowerCase().includes(row.name?.toLowerCase() ?? ''),
        ) ?? existingRows?.[0];

      const structuredFields = {
        flavor_tags: params.flavorProfile?.filter(Boolean) ?? [],
        tasting_notes: params.tastingNotes?.trim() || null,
        food_pairings: params.foodPairings?.filter(Boolean) ?? [],
        serving_temps: params.servingTemperature?.filter(Boolean) ?? [],
      };

      if (existing) {
        console.log('Sake already exists, returning existing ID:', existing.id);
        const patch: Record<string, unknown> = {};
        if (structuredFields.tasting_notes) patch.tasting_notes = structuredFields.tasting_notes;
        if (structuredFields.flavor_tags.length > 0) patch.flavor_tags = structuredFields.flavor_tags;
        if (structuredFields.food_pairings.length > 0) patch.food_pairings = structuredFields.food_pairings;
        if (structuredFields.serving_temps.length > 0) patch.serving_temps = structuredFields.serving_temps;
        // If the existing record has no image and we have one, upload & patch it
        if (!existing.image_url && params.imageUrl) {
          try {
            const storagePath = await uploadLabelImage(params.imageUrl, existing.id);
            if (storagePath) {
              patch.image_url = storagePath;
              console.log('📸 Patched missing image_url on existing sake');
            }
          } catch (uploadErr) {
            console.warn('⚠️ Could not upload label image for existing sake:', uploadErr);
          }
        }
        if (Object.keys(patch).length > 0) {
          await supabase.from('sake').update(patch).eq('id', existing.id);
        }
        return { id: existing.id, isNew: false };
      }

      // Keep description as narrative prose; structured columns hold tasting metadata
      const mainDescription = params.description?.trim() || null;

      // Create new sake with all available data
      const { data, error } = await supabase
        .from('sake')
        .insert({
          name: params.name,
          name_japanese: params.nameJapanese ?? null,
          brewery: params.brewery,
          type: params.type ?? null,
          subtype: params.subtype ?? null,
          prefecture: params.prefecture ?? null,
          region: params.region ?? null,
          description: mainDescription,
          ...structuredFields,
          rice_variety: params.riceVariety ?? null,
          polishing_ratio: params.polishingRatio ?? null,
          alcohol_percentage: params.alcoholPercentage ?? null,
        } as Record<string, unknown>)
        .select('id')
        .single();

      if (error) throw error;
      console.log('✅ Created sake with rich OpenAI data in Supabase');

      // Upload the label photo and store the path on the new record
      if (params.imageUrl) {
        try {
          const storagePath = await uploadLabelImage(params.imageUrl, data.id);
          if (storagePath) {
            await supabase.from('sake').update({ image_url: storagePath } as Record<string, unknown>).eq('id', data.id);
            console.log('📸 Label image uploaded and linked to sake:', storagePath);
          }
        } catch (uploadErr) {
          console.warn('⚠️ Could not upload label image (non-fatal):', uploadErr);
        }
      }

      return { id: data.id, isNew: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sake'] });
    },
  });
}

export function useCreateScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      sakeId: string;
      imageUrl?: string;
      ocrRawText?: string;
    }) => {
      const { data, error } = await supabase
        .from('scans')
        .insert({
          user_id: params.userId,
          sake_id: params.sakeId,
          scanned_image_url: params.imageUrl ?? null,
          ocr_raw_text: params.ocrRawText ?? null,
          matched: true,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      void import('./social-hooks').then(({ emitActivityEvent }) =>
        emitActivityEvent({
          actorId: variables.userId,
          type: 'scan',
          sakeId: variables.sakeId,
          scanId: (data as { id?: string })?.id,
        }),
      );
    },
  });
}

export function useCreateMenuScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      preferredFlavors?: string[];
      budgetBias?: string;
      city?: string | null;
      items: Array<{
        sakeId?: string;
        name: string;
        nameJapanese?: string;
        brewery?: string;
        type?: string;
        price?: string;
        size?: string;
        description?: string;
        tastingNotes?: string;
        flavorProfile?: string[];
        averageRating?: number;
        recommendationScore?: number;
        recommendationTier?: string;
        recommendationReasons?: string[];
        valueLabel?: string;
        valueChip?: string;
      }>;
    }) => {
      const { data: scan, error: scanError } = await supabase
        .from('menu_scans')
        .insert({
          user_id: params.userId,
          preferred_flavors: params.preferredFlavors ?? [],
          budget_bias: params.budgetBias ?? null,
          city: params.city ?? null,
          item_count: params.items.length,
        } as Record<string, unknown>)
        .select()
        .single();

      if (scanError) throw scanError;

      const rows = params.items.map((item, index) => ({
        menu_scan_id: scan.id,
        sake_id: item.sakeId ?? null,
        name: item.name,
        name_japanese: item.nameJapanese ?? null,
        brewery: item.brewery ?? null,
        type: item.type ?? null,
        price: item.price ?? null,
        size: item.size ?? null,
        description: item.description ?? null,
        tasting_notes: item.tastingNotes ?? null,
        flavor_profile: item.flavorProfile ?? [],
        average_rating: item.averageRating ?? null,
        recommendation_score: item.recommendationScore ?? null,
        recommendation_tier: item.recommendationTier ?? null,
        recommendation_reasons: item.recommendationReasons ?? [],
        value_label: item.valueLabel ?? null,
        value_chip: item.valueChip ?? null,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('menu_scan_items')
        .insert(rows as Record<string, unknown>[]);

      if (itemsError) throw itemsError;
      return scan;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu_scans'] });
      queryClient.invalidateQueries({ queryKey: ['menuScanQuota', variables.userId] });
      const sakeIds = [
        ...new Set(
          variables.items
            .map((item) => item.sakeId)
            .filter((sakeId): sakeId is string => !!sakeId)
        ),
      ];
      for (const sakeId of sakeIds) {
        queryClient.invalidateQueries({ queryKey: ['menu_prices', sakeId] });
      }
    },
  });
}

/** Recent menu prices for a catalog sake (Phase 4 “Seen on menus”). */
export function useMenuPricesForSake(sakeId: string | undefined, limit = 8) {
  return useQuery({
    queryKey: ['menu_prices', sakeId, limit],
    queryFn: async () => {
      if (!sakeId) return [] as MenuPriceSighting[];

      const { data, error } = await supabase.rpc('get_menu_prices_for_sake', {
        p_sake_id: sakeId,
        p_limit: limit,
      });

      if (error) throw error;
      return (data ?? []) as MenuPriceSighting[];
    },
    enabled: !!sakeId,
  });
}

// ============ USER QUERIES ============

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as User;
    },
    enabled: !!userId,
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      displayName?: string;
      avatarUrl?: string;
      location?: string;
      bio?: string;
    }) => {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (params.displayName !== undefined) updates.display_name = params.displayName;
      if (params.avatarUrl !== undefined) updates.avatar_url = params.avatarUrl;
      if (params.location !== undefined) updates.location = params.location;
      if (params.bio !== undefined) updates.bio = params.bio;

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', params.userId)
        .select()
        .single();

      if (error) throw error;
      return data as User;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['social', 'profile', variables.userId] });
    },
  });
}

// ============ FAVORITES QUERIES ============

export function useUserFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: ['favorites', 'user', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('favorites')
        .select(`
          *,
          sake:sake_id (
            name,
            brewery,
            type,
            image_url,
            average_rating
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FavoriteWithSake[];
    },
    enabled: !!userId,
  });
}

export function useIsFavorite(userId: string | undefined, sakeId: string | undefined) {
  return useQuery({
    queryKey: ['favorites', 'check', userId, sakeId],
    queryFn: async () => {
      if (!userId || !sakeId) return false;

      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('sake_id', sakeId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!userId && !!sakeId,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { userId: string; sakeId: string; isFavorite: boolean }) => {
      if (params.isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', params.userId)
          .eq('sake_id', params.sakeId);

        if (error) throw error;
        return { added: false };
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: params.userId,
            sake_id: params.sakeId,
          } as Record<string, unknown>);

        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favorites', 'user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['favorites', 'check', variables.userId, variables.sakeId] });
      if (result.added) {
        void import('./social-hooks').then(({ emitActivityEvent }) =>
          emitActivityEvent({
            actorId: variables.userId,
            type: 'favorite',
            sakeId: variables.sakeId,
          }),
        );
      }
    },
  });
}

// ============ MENU SCAN QUOTA (Free tier) ============

export function useMenuScanQuota(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['menuScanQuota', userId],
    queryFn: async () => {
      if (!userId) {
        return { used: 0, limit: 3, monthStart: null as string | null };
      }
      const { data, error } = await supabase.rpc('get_menu_scan_quota');
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | { used?: number | string; limit_count?: number; month_start?: string }
        | null
        | undefined;
      return {
        used: Number(row?.used ?? 0),
        limit: Number(row?.limit_count ?? 3),
        monthStart: row?.month_start ?? null,
      };
    },
    enabled: !!userId && enabled,
    staleTime: 30_000,
  });
}
