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

/** Exact brewery match (case-insensitive) for brewery detail pages. */
export function useSakeByBrewery(breweryName: string | undefined) {
  return useQuery({
    queryKey: ['sake', 'brewery', breweryName],
    queryFn: async () => {
      if (!breweryName?.trim()) return [];

      const { data, error } = await supabase
        .from('sake')
        .select('*')
        .ilike('brewery', breweryName.trim())
        .order('average_rating', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as Sake[];
    },
    enabled: !!breweryName?.trim(),
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ratings', 'sake', variables.sakeId] });
      queryClient.invalidateQueries({ queryKey: ['ratings', 'user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['sake', variables.sakeId] });
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

export function useClearUserRatings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('ratings').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
      queryClient.invalidateQueries({ queryKey: ['ratings', 'user', userId] });
      queryClient.invalidateQueries({ queryKey: ['sake'] });
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
            average_rating
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

function isRemoteHttpsUrl(value: string | null | undefined): boolean {
  return !!value && /^https:\/\//i.test(value.trim());
}

function isLocalImageUri(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  if (isRemoteHttpsUrl(v)) return false;
  // Camera/library URIs or any non-http path that still needs uploading
  return (
    v.startsWith('file://') ||
    v.startsWith('content://') ||
    v.startsWith('ph://') ||
    v.startsWith('assets-library://') ||
    v.startsWith('/') ||
    !/^https?:\/\//i.test(v)
  );
}

type UploadedLabelImage = {
  /** Object path inside the sake-images bucket */
  path: string;
  /** Public HTTPS Storage URL for DB / backend promotion pipelines */
  publicUrl: string;
};

/**
 * Upload a local label/scan photo to the public sake-images bucket.
 * Path is scoped to `{userId|anonymous}/…` so Storage RLS INSERT policies allow the write.
 * Always returns a public HTTPS URL (required for scan-photo image-DB promotion).
 */
async function uploadLabelImage(
  localUri: string,
  sakeId: string,
  options?: { userId?: string | null; kind?: 'labels' | 'scans' },
): Promise<UploadedLabelImage | null> {
  if (!localUri?.trim()) return null;

  if (isRemoteHttpsUrl(localUri)) {
    return { path: localUri, publicUrl: localUri.trim() };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const owner = options?.userId ?? user?.id ?? 'anonymous';
  const kind = options?.kind ?? 'labels';
  const path = `${owner}/${kind}/${sakeId}-${Date.now()}.jpg`;

  try {
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
    const { data } = supabase.storage.from('sake-images').getPublicUrl(path);
    if (!data.publicUrl) {
      console.warn('Storage upload succeeded but public URL was empty');
      return null;
    }
    console.log('📸 Uploaded label image to Storage:', data.publicUrl);
    return { path, publicUrl: data.publicUrl };
  } catch (err) {
    console.warn('Storage upload failed:', err);
    return null;
  }
}

/** Resolve a local scan URI to a public HTTPS Storage URL (uploads when needed). */
async function ensureScanImageHttpsUrl(params: {
  imageUri?: string | null;
  userId: string;
  sakeId: string;
}): Promise<string | null> {
  const imageUri = params.imageUri?.trim();
  if (!imageUri) return null;
  if (isRemoteHttpsUrl(imageUri)) return imageUri;

  const uploaded = await uploadLabelImage(imageUri, params.sakeId, {
    userId: params.userId,
    kind: 'scans',
  });
  return uploaded?.publicUrl ?? null;
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

      if (existing) {
        console.log('Sake already exists, returning existing ID:', existing.id);
        // If the existing record has no image and we have a local photo, upload & patch it
        if (!existing.image_url && params.imageUrl) {
          try {
            const uploaded = isLocalImageUri(params.imageUrl)
              ? await uploadLabelImage(params.imageUrl, existing.id, { kind: 'labels' })
              : isRemoteHttpsUrl(params.imageUrl)
                ? { path: params.imageUrl, publicUrl: params.imageUrl.trim() }
                : null;
            if (uploaded) {
              await supabase
                .from('sake')
                .update({ image_url: uploaded.publicUrl } as Record<string, unknown>)
                .eq('id', existing.id);
              console.log('📸 Patched missing image_url on existing sake:', uploaded.publicUrl);
            }
          } catch (uploadErr) {
            console.warn('⚠️ Could not upload label image for existing sake:', uploadErr);
          }
        }
        return { id: existing.id, isNew: false };
      }

      // Build a rich description that includes all OpenAI extracted data
      const richDescription = buildRichDescription({
        description: params.description,
        tastingNotes: params.tastingNotes,
        foodPairings: params.foodPairings,
        flavorProfile: params.flavorProfile,
        servingTemperature: params.servingTemperature,
      });

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
          description: richDescription,
          rice_variety: params.riceVariety ?? null,
          polishing_ratio: params.polishingRatio ?? null,
          alcohol_percentage: params.alcoholPercentage ?? null,
        } as Record<string, unknown>)
        .select('id')
        .single();

      if (error) throw error;
      console.log('✅ Created sake with rich OpenAI data in Supabase');

      // Upload the label photo and store the public HTTPS URL on the new record
      if (params.imageUrl && isLocalImageUri(params.imageUrl)) {
        try {
          const uploaded = await uploadLabelImage(params.imageUrl, data.id, { kind: 'labels' });
          if (uploaded) {
            await supabase
              .from('sake')
              .update({ image_url: uploaded.publicUrl } as Record<string, unknown>)
              .eq('id', data.id);
            console.log('📸 Label image uploaded and linked to sake:', uploaded.publicUrl);
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

// Helper function to build rich description with all OpenAI data
function buildRichDescription(data: {
  description?: string;
  tastingNotes?: string;
  foodPairings?: string[];
  flavorProfile?: string[];
  servingTemperature?: string[];
}) {
  const parts: string[] = [];

  // Main description
  if (data.description) {
    parts.push(data.description);
  }

  // Tasting notes
  if (data.tastingNotes) {
    parts.push(`\n\n**Tasting Notes:** ${data.tastingNotes}`);
  }

  // Flavor profile
  if (data.flavorProfile && data.flavorProfile.length > 0) {
    parts.push(`\n\n**Flavor Profile:** ${data.flavorProfile.join(', ')}`);
  }

  // Food pairings
  if (data.foodPairings && data.foodPairings.length > 0) {
    parts.push(`\n\n**Food Pairings:** ${data.foodPairings.join(', ')}`);
  }

  // Serving temperature
  if (data.servingTemperature && data.servingTemperature.length > 0) {
    parts.push(`\n\n**Serving Temperature:** ${data.servingTemperature.join(', ')}`);
  }

  return parts.join('') || null;
}

export function useCreateScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      sakeId: string;
      /** Local camera/library URI or already-public HTTPS Storage URL */
      imageUrl?: string;
      ocrRawText?: string;
      /** When true (default), fill empty sake.image_url from the uploaded scan photo */
      promoteToSakeImage?: boolean;
    }) => {
      // Backend image-DB promotion requires HTTPS Storage URLs — never persist file:// URIs.
      const scannedImageUrl = await ensureScanImageHttpsUrl({
        imageUri: params.imageUrl,
        userId: params.userId,
        sakeId: params.sakeId,
      });

      if (params.imageUrl && !scannedImageUrl) {
        console.warn(
          '⚠️ Scan image upload failed; saving scan without scanned_image_url so local file URIs are not written to the DB',
        );
      }

      const { data, error } = await supabase
        .from('scans')
        .insert({
          user_id: params.userId,
          sake_id: params.sakeId,
          scanned_image_url: scannedImageUrl,
          ocr_raw_text: params.ocrRawText ?? null,
          matched: true,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) throw error;

      // Promote scan photo onto catalog sake rows that still lack an image
      if ((params.promoteToSakeImage ?? true) && scannedImageUrl) {
        try {
          const { data: sakeRow } = await supabase
            .from('sake')
            .select('id, image_url')
            .eq('id', params.sakeId)
            .maybeSingle();

          if (sakeRow && !sakeRow.image_url) {
            const { error: promoteError } = await supabase
              .from('sake')
              .update({ image_url: scannedImageUrl } as Record<string, unknown>)
              .eq('id', params.sakeId)
              .is('image_url', null);

            if (promoteError) {
              console.warn('⚠️ Could not promote scan photo to sake.image_url:', promoteError.message);
            } else {
              console.log('📸 Promoted scan photo to sake.image_url:', scannedImageUrl);
              queryClient.invalidateQueries({ queryKey: ['sake', params.sakeId] });
              queryClient.invalidateQueries({ queryKey: ['sake'] });
            }
          }
        } catch (promoteErr) {
          console.warn('⚠️ Sake image promotion failed (non-fatal):', promoteErr);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
    },
  });
}

export function useDeleteScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { scanId: string; userId: string }) => {
      const { error } = await supabase
        .from('scans')
        .delete()
        .eq('id', params.scanId)
        .eq('user_id', params.userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['scans', 'user', variables.userId] });
    },
  });
}

export function useClearUserScans() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('scans').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['scans', 'user', userId] });
    },
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
    mutationFn: async (params: { userId: string; displayName?: string; avatarUrl?: string; location?: string }) => {
      const { data, error } = await supabase
        .from('users')
        .update({
          display_name: params.displayName ?? null,
          avatar_url: params.avatarUrl ?? null,
          location: params.location ?? null,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', params.userId)
        .select()
        .single();

      if (error) throw error;
      return data as User;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favorites', 'user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['favorites', 'check', variables.userId, variables.sakeId] });
    },
  });
}
