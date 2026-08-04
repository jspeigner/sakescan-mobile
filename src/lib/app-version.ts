import * as Application from 'expo-application';
import Constants from 'expo-constants';

function configVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

function configBuildNumber(): string | null {
  const iosBuild = Constants.expoConfig?.ios?.buildNumber;
  if (typeof iosBuild === 'string' && iosBuild.trim().length > 0) {
    return iosBuild.trim();
  }
  const androidCode = Constants.expoConfig?.android?.versionCode;
  if (typeof androidCode === 'number' && Number.isFinite(androidCode)) {
    return String(androidCode);
  }
  return null;
}

/** True only in Expo Go — not standalone / TestFlight / production / dev clients. */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Marketing version shown to users (e.g. "2.1.7").
 *
 * Store / TestFlight / production always prefer the native binary value so the
 * Profile label matches App Store Connect. Expo Go reports the Expo Go client
 * version via nativeApplicationVersion, so use app config there instead.
 */
export function getAppVersion(): string {
  if (isExpoGo()) {
    return configVersion();
  }

  return Application.nativeApplicationVersion ?? configVersion();
}

/**
 * Native build number / version code (e.g. "14").
 * Same Expo Go caveat as getAppVersion — never show the Expo Go client build.
 */
export function getAppBuildNumber(): string | null {
  if (isExpoGo()) {
    return configBuildNumber();
  }

  const build = Application.nativeBuildVersion;
  if (typeof build === 'string' && build.trim().length > 0) {
    return build.trim();
  }
  return configBuildNumber();
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

/**
 * Label for Profile / About, e.g. "SakeScan v2.1.7 (14)".
 * Always derived from the installed binary in TestFlight / App Store builds.
 */
export function getAppVersionLabel(): string {
  return formatAppVersionLabel(getAppVersion(), getAppBuildNumber());
}
