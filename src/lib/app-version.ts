import * as Application from 'expo-application';
import Constants from 'expo-constants';

/**
 * Marketing version shown to users (e.g. "2.1.7").
 * Prefers the native binary value so Profile matches TestFlight / App Store.
 */
export function getAppVersion(): string {
  return (
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    '0.0.0'
  );
}

/** Native build number / version code (e.g. "13"), if available. */
export function getAppBuildNumber(): string | null {
  const build = Application.nativeBuildVersion;
  if (typeof build === 'string' && build.trim().length > 0) {
    return build.trim();
  }
  return null;
}

/** Pure formatter used by Profile / About. */
export function formatAppVersionLabel(
  version: string,
  buildNumber?: string | null,
): string {
  const trimmedBuild =
    typeof buildNumber === 'string' && buildNumber.trim().length > 0
      ? buildNumber.trim()
      : null;
  return trimmedBuild
    ? `SakeScan v${version} (${trimmedBuild})`
    : `SakeScan v${version}`;
}

/** Label for Profile / About, e.g. "SakeScan v2.1.7 (13)". */
export function getAppVersionLabel(): string {
  return formatAppVersionLabel(getAppVersion(), getAppBuildNumber());
}
