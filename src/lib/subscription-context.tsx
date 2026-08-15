import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import { useAuth } from './auth-context';
import {
  addCustomerInfoListener,
  configurePurchases,
  customerHasPro,
  getCustomerInfoSafe,
  getOfferingsSafe,
  logInPurchases,
  logOutPurchases,
  pickAnnualPackage,
  pickMonthlyPackage,
  purchasePackageSafe,
  restorePurchasesSafe,
  isPurchasesConfigured,
} from './purchases';

interface SubscriptionContextType {
  isPro: boolean;
  isReady: boolean;
  isLoading: boolean;
  offerings: PurchasesOfferings | null;
  annualPackage: PurchasesPackage | null;
  monthlyPackage: PurchasesPackage | null;
  customerInfo: CustomerInfo | null;
  refresh: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<{ success: boolean; cancelled: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; isPro: boolean; error?: string }>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

function customerQueryKey(userId: string | undefined) {
  return ['subscription', 'customer', userId ?? 'anon'] as const;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [sdkReady, setSdkReady] = useState(false);
  const userId = user?.id;

  const applyCustomerInfo = useCallback(
    (info: CustomerInfo | null | undefined) => {
      if (!info) return;
      // Cancel in-flight fetches so a stale pre-purchase response cannot
      // overwrite the fresh CustomerInfo we just received.
      void queryClient.cancelQueries({ queryKey: customerQueryKey(userId) });
      queryClient.setQueryData(customerQueryKey(userId), info);
      queryClient.invalidateQueries({ queryKey: ['menuScanQuota'] });
    },
    [queryClient, userId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await configurePurchases();
      if (!cancelled) setSdkReady(ok || true); // mark ready even if key missing so UI can show fallbacks
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep React Query in sync whenever RevenueCat pushes CustomerInfo updates
  // (purchases, restores, renewals detected on-device).
  useEffect(() => {
    if (!sdkReady || !isPurchasesConfigured()) return;
    return addCustomerInfoListener((info) => {
      applyCustomerInfo(info);
    });
  }, [sdkReady, applyCustomerInfo]);

  // Identify user with RevenueCat when authenticated. Skip while auth is still
  // resolving so we don't logOut() an anonymous/configured SDK mid-bootstrap.
  useEffect(() => {
    if (!sdkReady || !isPurchasesConfigured() || authLoading) return;
    let cancelled = false;
    (async () => {
      let info: CustomerInfo | null = null;
      if (userId && !isGuest) {
        info = await logInPurchases(userId);
      } else {
        await logOutPurchases();
        info = await getCustomerInfoSafe();
      }
      if (!cancelled) {
        if (info) {
          applyCustomerInfo(info);
        } else {
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sdkReady, userId, isGuest, authLoading, queryClient, applyCustomerInfo]);

  // Re-check entitlements when returning to foreground (covers renewals / family share).
  // Fetch + apply instead of invalidate-only so a stale in-flight response cannot
  // clobber a just-completed purchase.
  useEffect(() => {
    if (!sdkReady || !isPurchasesConfigured()) return;
    const onChange = (state: AppStateStatus) => {
      if (state !== 'active') return;
      void (async () => {
        const info = await getCustomerInfoSafe();
        if (info) applyCustomerInfo(info);
      })();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [sdkReady, applyCustomerInfo]);

  const customerQuery = useQuery({
    queryKey: customerQueryKey(userId),
    queryFn: getCustomerInfoSafe,
    enabled: sdkReady && isPurchasesConfigured() && !authLoading,
    staleTime: 60_000,
  });

  const offeringsQuery = useQuery({
    queryKey: ['subscription', 'offerings'],
    queryFn: getOfferingsSafe,
    enabled: sdkReady && isPurchasesConfigured(),
    staleTime: 5 * 60_000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => purchasePackageSafe(pkg),
    onSuccess: (result) => {
      if (result.customerInfo) {
        applyCustomerInfo(result.customerInfo);
      }
    },
  });
  const { mutateAsync: purchaseMutateAsync, isPending: purchasePending } = purchaseMutation;

  const restoreMutation = useMutation({
    mutationFn: restorePurchasesSafe,
    onSuccess: (result) => {
      if (result.customerInfo) {
        applyCustomerInfo(result.customerInfo);
      }
    },
  });
  const { mutateAsync: restoreMutateAsync, isPending: restorePending } = restoreMutation;

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['subscription'] }),
      queryClient.invalidateQueries({ queryKey: ['menuScanQuota'] }),
    ]);
  }, [queryClient]);

  const purchase = useCallback(
    async (pkg: PurchasesPackage) => {
      const result = await purchaseMutateAsync(pkg);
      if (result.cancelled) return { success: false, cancelled: true };
      if (result.error) return { success: false, cancelled: false, error: result.error };

      if (result.customerInfo) {
        applyCustomerInfo(result.customerInfo);
      }

      const pro = customerHasPro(result.customerInfo);
      if (!pro) {
        return {
          success: false,
          cancelled: false,
          error:
            'Payment went through, but Pro access is not active yet. Tap Restore Purchases, or wait a moment and try again.',
        };
      }
      return { success: true, cancelled: false };
    },
    [purchaseMutateAsync, applyCustomerInfo],
  );

  const restore = useCallback(async () => {
    const result = await restoreMutateAsync();
    if (result.error) return { success: false, isPro: false, error: result.error };
    if (result.customerInfo) {
      applyCustomerInfo(result.customerInfo);
    }
    const pro = customerHasPro(result.customerInfo);
    return { success: true, isPro: pro };
  }, [restoreMutateAsync, applyCustomerInfo]);

  const offerings = offeringsQuery.data ?? null;
  const customerInfo = customerQuery.data ?? null;
  const isPro = customerHasPro(customerInfo);

  const value = useMemo<SubscriptionContextType>(
    () => ({
      isPro,
      isReady: sdkReady,
      isLoading:
        !sdkReady ||
        authLoading ||
        customerQuery.isLoading ||
        offeringsQuery.isLoading ||
        purchasePending ||
        restorePending,
      offerings,
      annualPackage: pickAnnualPackage(offerings),
      monthlyPackage: pickMonthlyPackage(offerings),
      customerInfo,
      refresh,
      purchase,
      restore,
    }),
    [
      isPro,
      sdkReady,
      authLoading,
      customerQuery.isLoading,
      offeringsQuery.isLoading,
      purchasePending,
      restorePending,
      offerings,
      customerInfo,
      refresh,
      purchase,
      restore,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return ctx;
}
