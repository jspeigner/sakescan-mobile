import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_SUPABASE_URL = 'https://qpsdebikkmcdzddhphlk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwc2RlYmlra21jZHpkZGhwaGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTI5MzgsImV4cCI6MjA4NTQ4ODkzOH0.A0opwU7korq5NaPPV9y4PlBC89GPTEEzgq8WALiw99g';

/** Trimmed non-empty string, or undefined (treats whitespace-only as missing). */
function envString(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

function isValidSupabaseHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.length > 2;
  } catch {
    return false;
  }
}

/** Supabase anon JWTs are three base64url segments starting with eyJ */
function isPlausibleSupabaseAnonKey(key: string): boolean {
  const parts = key.split('.');
  return parts.length === 3 && parts[0]?.startsWith('eyJ') === true && key.length > 80;
}

function decodeJwtRef(anonKey: string): string | null {
  try {
    const payload = anonKey.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const decoded = JSON.parse(atob(padded)) as { ref?: string };
    return decoded.ref ?? null;
  } catch {
    return null;
  }
}

/** Project ref from `https://<ref>.supabase.co` */
function supabaseUrlProjectRef(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const m = /^([a-z0-9]+)\.supabase\.co$/i.exec(host);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve Supabase URL and anon key from env. Supports both common variable names
 * (EXPO_PUBLIC_SUPABASE_ANON_KEY is the Supabase default) and trims accidental whitespace.
 * URL and anon key are always kept as a matching pair: if one falls back to defaults while the
 * other came from env with a different project ref, we use the full default pair (fixes Explore
 * failing when only URL or only key is set wrong).
 */
function resolveSupabaseConfig(): { url: string; anonKey: string } {
  const envUrlRaw = envString(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const envKeyRaw =
    envString(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ??
    envString(process.env.EXPO_PUBLIC_SUPABASE_KEY);

  let urlCandidate =
    envUrlRaw && isValidSupabaseHttpsUrl(envUrlRaw) ? envUrlRaw : DEFAULT_SUPABASE_URL;
  if (envUrlRaw && !isValidSupabaseHttpsUrl(envUrlRaw)) {
    console.warn(
      '[Supabase] EXPO_PUBLIC_SUPABASE_URL is invalid; using default project URL. Fix this in EAS Environment Variables or .env.',
    );
  }

  let keyCandidate =
    envKeyRaw && isPlausibleSupabaseAnonKey(envKeyRaw) ? envKeyRaw : DEFAULT_SUPABASE_ANON_KEY;
  if (envKeyRaw && !isPlausibleSupabaseAnonKey(envKeyRaw)) {
    console.warn(
      '[Supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY / EXPO_PUBLIC_SUPABASE_KEY does not look like a Supabase anon JWT; using default key. Fix this in EAS or .env.',
    );
  }

  const urlRef = supabaseUrlProjectRef(urlCandidate);
  const keyRef = decodeJwtRef(keyCandidate);
  if (
    urlRef &&
    keyRef &&
    urlRef.toLowerCase() !== keyRef.toLowerCase()
  ) {
    console.warn(
      '[Supabase] URL project ref and anon key ref do not match — using embedded default URL + key. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY from the same Supabase project.',
    );
    urlCandidate = DEFAULT_SUPABASE_URL;
    keyCandidate = DEFAULT_SUPABASE_ANON_KEY;
  }

  const normalizedUrl = urlCandidate.replace(/\/+$/, '');
  const anonKey = keyCandidate;

  if (__DEV__) {
    const urlHost = (() => {
      try {
        return new URL(normalizedUrl).hostname;
      } catch {
        return '';
      }
    })();
    const jwtRef = decodeJwtRef(anonKey) ?? '';
    if (
      jwtRef &&
      urlHost.includes('.supabase.co') &&
      !urlHost.startsWith(`${jwtRef}.`)
    ) {
      console.warn(
        '[Supabase] URL host does not match anon key project ref — requests will fail. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
      );
    }
  }

  return { url: normalizedUrl, anonKey };
}

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = resolveSupabaseConfig();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Helper to ensure user exists in public.users table (for when DB trigger isn't set up)
export const ensureUserExists = async (userId: string, email?: string) => {
  try {
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('[ensureUserExists] Error checking user:', checkError);
    }

    if (!existingUser) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email ?? null,
          display_name: email ? email.split('@')[0] : 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>);

      if (insertError) {
        console.error('[ensureUserExists] Failed to create user:', insertError);
        throw insertError;
      }
    }
  } catch (error) {
    console.error('[ensureUserExists] Unexpected error:', error);
    throw error;
  }
};

// Helper to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Helper to get current session
export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

/**
 * Placeholder when `sake.image_url` is empty or cannot be resolved.
 * Use null so components can render a proper styled placeholder instead of a generic image.
 */
export const FALLBACK_SAKE_LABEL_URL: string | null = null;

/** Resolve sake image URL from DB value. Handles both full URLs and Supabase storage paths. */
export function resolveSakeImageUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const path = trimmed.startsWith('sake-images/') ? trimmed.slice('sake-images/'.length) : trimmed;
  const { data } = supabase.storage.from('sake-images').getPublicUrl(path);
  return data.publicUrl;
}
