import Constants from 'expo-constants';

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
 *
 * Use a stable custom-scheme URL (not Linking.createURL) so TestFlight/production always emit
 * `sakescan://auth/callback` that matches the Supabase allow list. Expo Go / dev clients may
 * still need the exp:// URLs added in the dashboard.
 *
 * Also allowlist:
 * - sakescan://auth/callback
 * - sakescan://reset-password
 * - https://www.sakescan.com/auth/callback (web bridge)
 */
export function getAuthEmailRedirectUri(): string {
  // Stable production deep link — do not use Linking.createURL here (can emit exp:// or /--/ paths).
  return `${getAppUrlScheme()}://auth/callback`;
}

/** Web auth bridge used when email clients cannot open custom schemes directly. */
export function getAuthWebRedirectUri(): string {
  return 'https://www.sakescan.com/auth/callback';
}

/** Deep link to a public user profile. */
export function getUserDeepLink(userId: string): string {
  return `${getAppUrlScheme()}://user/${userId}`;
}

/** Deep link to a sake detail screen. */
export function getSakeDeepLink(sakeId: string): string {
  return `${getAppUrlScheme()}://sake/${sakeId}`;
}
