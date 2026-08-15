import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';

/** RevenueCat entitlement identifier (configure in RC dashboard). */
export const PRO_ENTITLEMENT_ID = 'pro';

export const FREE_MENU_SCANS_PER_MONTH = 3;
export const FREE_FAVORITES_LIMIT = 20;

/** Fallback prices when offerings are unavailable (match App Store products). */
export const FALLBACK_PRICES = {
  annual: '$29.99',
  monthly: '$4.99',
  annualPerMonth: '$2.50',
} as const;

let configured = false;

export function isPurchasesConfigured(): boolean {
  return configured;
}

export function getRevenueCatApiKey(): string | null {
  const ios = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
  const android = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
  if (Platform.OS === 'ios') return ios || null;
  if (Platform.OS === 'android') return android || ios || null;
  return ios || android || null;
}

export async function configurePurchases(): Promise<boolean> {
  if (configured) return true;
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    console.warn('[Purchases] No EXPO_PUBLIC_REVENUECAT_* API key — Pro purchases disabled');
    return false;
  }
  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey });
    configured = true;
    return true;
  } catch (err) {
    console.warn('[Purchases] configure failed:', err);
    return false;
  }
}

/**
 * True when the customer should have SakeScan Pro.
 * Prefer the configured entitlement, but also honor any active entitlement or
 * Store subscription so a dashboard product↔entitlement mismatch cannot leave
 * paying users stuck behind the paywall.
 */
export function customerHasPro(info: CustomerInfo | null | undefined): boolean {
  if (!info) return false;

  const activeEntitlements = info.entitlements?.active ?? {};
  const direct = activeEntitlements[PRO_ENTITLEMENT_ID];
  if (direct) return true;

  for (const [key, ent] of Object.entries(activeEntitlements)) {
    if (!ent) continue;
    if (key.toLowerCase() === PRO_ENTITLEMENT_ID.toLowerCase()) return true;
    if (key.toLowerCase().includes('pro')) return true;
  }

  // Paid in the store but entitlement not mapped in RevenueCat yet.
  if ((info.activeSubscriptions?.length ?? 0) > 0) return true;

  return false;
}

export async function getCustomerInfoSafe(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.warn('[Purchases] getCustomerInfo failed:', err);
    return null;
  }
}

/** Force a network refresh of CustomerInfo (use after purchase/restore). */
export async function refreshCustomerInfoSafe(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    await Purchases.invalidateCustomerInfoCache();
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.warn('[Purchases] refreshCustomerInfo failed:', err);
    return getCustomerInfoSafe();
  }
}

export function addCustomerInfoListener(listener: CustomerInfoUpdateListener): () => void {
  if (!configured) return () => undefined;
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function getOfferingsSafe(): Promise<PurchasesOfferings | null> {
  if (!configured) return null;
  try {
    return await Purchases.getOfferings();
  } catch (err) {
    console.warn('[Purchases] getOfferings failed:', err);
    return null;
  }
}

export async function logInPurchases(userId: string): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (err) {
    console.warn('[Purchases] logIn failed:', err);
    return null;
  }
}

export async function logOutPurchases(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    console.warn('[Purchases] logOut failed:', err);
  }
}

export function pickAnnualPackage(offerings: PurchasesOfferings | null): PurchasesPackage | null {
  const current = offerings?.current;
  if (!current) return null;
  return (
    current.annual ??
    current.availablePackages.find(
      (p) =>
        p.packageType === PACKAGE_TYPE.ANNUAL ||
        p.product.identifier.toLowerCase().includes('annual') ||
        p.product.identifier.toLowerCase().includes('year'),
    ) ??
    null
  );
}

export function pickMonthlyPackage(offerings: PurchasesOfferings | null): PurchasesPackage | null {
  const current = offerings?.current;
  if (!current) return null;
  return (
    current.monthly ??
    current.availablePackages.find(
      (p) =>
        p.packageType === PACKAGE_TYPE.MONTHLY ||
        p.product.identifier.toLowerCase().includes('month'),
    ) ??
    null
  );
}

export async function purchasePackageSafe(
  pkg: PurchasesPackage,
): Promise<{ customerInfo: CustomerInfo | null; cancelled: boolean; error?: string }> {
  if (!configured) {
    return { customerInfo: null, cancelled: false, error: 'Purchases are not configured' };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    // Purchase result should already be fresh; still re-read so entitlement
    // / activeSubscriptions reflect the just-completed Store transaction.
    const refreshed = await refreshCustomerInfoSafe();
    return { customerInfo: refreshed ?? customerInfo, cancelled: false };
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'userCancelled' in err
        ? (err as { userCancelled?: boolean }).userCancelled
        : false;
    if (code) return { customerInfo: null, cancelled: true };
    const message = err instanceof Error ? err.message : 'Purchase failed';
    return { customerInfo: null, cancelled: false, error: message };
  }
}

export async function restorePurchasesSafe(): Promise<{
  customerInfo: CustomerInfo | null;
  error?: string;
}> {
  if (!configured) {
    return { customerInfo: null, error: 'Purchases are not configured' };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    const refreshed = await refreshCustomerInfoSafe();
    return { customerInfo: refreshed ?? customerInfo };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Restore failed';
    return { customerInfo: null, error: message };
  }
}
