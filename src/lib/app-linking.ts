import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

/**
 * Deep-link URL scheme from Expo config (`expo.scheme` in app.json).
 * Used for OAuth and must match Supabase Auth redirect allow list.
 */
export function getAppUrlScheme(): string {
  const raw = Constants.expoConfig?.scheme;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === 'string' && first.trim().length > 0) {
      return first.trim();
    }
  }
  return 'exp';
}

/** OAuth redirect URI for Supabase `signInWithOAuth` + `openAuthSessionAsync`. */
export function getOAuthRedirectUri(): string {
  return `${getAppUrlScheme()}://auth/callback`;
}

/**
 * Redirect for password recovery / magic links — must be listed in Supabase Auth → Redirect URLs.
 * Prefer this over a web-only URL so the app receives `#access_token` / PKCE params (B15).
 */
export function getAuthEmailRedirectUri(): string {
  return Linking.createURL('auth/callback');
}
