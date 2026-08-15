/**
 * HTTP client for SakeScan web/backend APIs (Vercel on sakescan.com).
 * Contract: jspeigner/Sakescan MOBILE_API.md
 */
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

const DEFAULT_BACKEND_URL = 'https://www.sakescan.com';

export function getBackendBaseUrl(): string {
  const fromEnv =
    process.env.EXPO_PUBLIC_BACKEND_URL?.trim() ||
    process.env.EXPO_PUBLIC_VIBECODE_BACKEND_URL?.trim();
  const base = (fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BACKEND_URL).replace(/\/+$/, '');
  return base;
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function readLocalImageBase64(localUri: string): Promise<string> {
  return FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function isHttpsUrl(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^https:\/\//i.test(value);
}

export type UploadScanImageResult = {
  success: boolean;
  url: string;
  path?: string;
  scanId?: string | null;
  updatedScan?: boolean;
};

/**
 * Upload a scan photo and return a public https Storage URL.
 * Prefer web API; fall back to direct Supabase Storage upload.
 */
export async function uploadScanImage(params: {
  localUri: string;
  scanId?: string;
  contentType?: string;
}): Promise<string | null> {
  const { localUri, scanId, contentType = 'image/jpeg' } = params;
  if (isHttpsUrl(localUri)) return localUri;

  const token = await getAccessToken();
  const base64 = await readLocalImageBase64(localUri);

  if (token) {
    try {
      const res = await fetch(`${getBackendBaseUrl()}/api/upload-scan-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
          contentType,
          ...(scanId ? { scanId } : {}),
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as UploadScanImageResult;
        if (json.url && isHttpsUrl(json.url)) return json.url;
      } else {
        console.warn('[backend-api] upload-scan-image failed:', res.status, await res.text());
      }
    } catch (err) {
      console.warn('[backend-api] upload-scan-image error, trying Storage fallback:', err);
    }
  }

  // Fallback: direct upload to sake-images/scan-uploads/<userId>/...
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const path = `scan-uploads/${userId}/${Date.now()}.jpg`;
  const { decode } = await import('base64-arraybuffer');
  const arrayBuffer = decode(base64);
  const { error } = await supabase.storage
    .from('sake-images')
    .upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) {
    console.warn('[backend-api] Storage scan upload error:', error.message);
    return null;
  }
  const { data: pub } = supabase.storage.from('sake-images').getPublicUrl(path);
  return pub.publicUrl ?? null;
}

export type ContributeScanImageResult = {
  success?: boolean;
  scannedImageUrl?: string;
  uploaded?: boolean;
  catalogImage?: unknown;
  promote?: unknown;
  error?: string;
};

/**
 * Opt in to share a scan photo for catalog fill (T2 provenance).
 */
export async function contributeScanImage(params: {
  scanId: string;
  localUri?: string;
  promoteNow?: boolean;
  contentType?: string;
}): Promise<ContributeScanImageResult> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not signed in');

  const body: Record<string, unknown> = {
    scanId: params.scanId,
    catalogShareOptIn: true,
    promoteNow: params.promoteNow ?? true,
    contentType: params.contentType ?? 'image/jpeg',
  };

  if (params.localUri && !isHttpsUrl(params.localUri)) {
    body.imageBase64 = await readLocalImageBase64(params.localUri);
  }

  const res = await fetch(`${getBackendBaseUrl()}/api/contribute-scan-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as ContributeScanImageResult;
  if (!res.ok) {
    throw new Error(json.error || `contribute-scan-image failed (${res.status})`);
  }
  return json;
}

/** Fallback account deletion via web API when RPC / Edge Function fail. */
export async function deleteAccountViaBackend(): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not signed in');

  const res = await fetch(`${getBackendBaseUrl()}/api/delete-account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `delete-account failed (${res.status})`);
  }
}

/**
 * Opt-in flag for local-first identify (`POST /api/identify-sake`) with optional
 * WineEngine fallback. Default off — edge `scan-label` remains the primary path.
 */
export function isBackendIdentifyEnabled(): boolean {
  const v = process.env.EXPO_PUBLIC_WINE_ENGINE_ENABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export type IdentifySakeMethod =
  | 'hash'
  | 'embedding'
  | 'wineengine'
  | 'embedding_low_confidence'
  | 'no_match';

export type IdentifySakeMatch = {
  sakeId?: string;
  sake_id?: string;
  similarity?: number;
  imageUrl?: string;
  image_url?: string;
  labelText?: string | null;
  label_text?: string | null;
};

export type IdentifySakeResult = {
  matched: boolean;
  method?: IdentifySakeMethod | string;
  sakeId?: string | null;
  sake?: Record<string, unknown> | null;
  similarity?: number | null;
  matches?: IdentifySakeMatch[];
  labelText?: string | null;
  querySha256?: string;
  cacheHit?: boolean;
  error?: string;
  details?: string;
};

/**
 * Preferred backend identify (Sakescan #39 / MOBILE_API.md).
 * Requires a public https image URL and a signed-in session.
 */
export async function identifySakeFromImageUrl(params: {
  imageUrl: string;
  limit?: number;
  allowWineEngineFallback?: boolean;
}): Promise<IdentifySakeResult> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not signed in');
  if (!isHttpsUrl(params.imageUrl)) {
    throw new Error('imageUrl must be a public https URL');
  }

  const res = await fetch(`${getBackendBaseUrl()}/api/identify-sake`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl: params.imageUrl,
      limit: params.limit ?? 5,
      allowWineEngineFallback: params.allowWineEngineFallback !== false,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as IdentifySakeResult;
  if (!res.ok) {
    throw new Error(json.error || json.details || `identify-sake failed (${res.status})`);
  }
  return json;
}
