import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import { useAuth } from './auth-context';
import {
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

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, isGuest } = useAuth();
  const queryClient = useQueryClient();
  const [sdkReady, setSdkReady] = useState(false);

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

  // Identify user with RevenueCat when authenticated
  useEffect(() => {
    if (!sdkReady || !isPurchasesConfigured()) return;
    let cancelled = false;
    (async () => {
      if (user?.id && !isGuest) {
        await logInPurchases(user.id);
      } else {
        await logOutPurchases();
      }
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sdkReady, user?.id, isGuest, queryClient]);

  const customerQuery = useQuery({
    queryKey: ['subscription', 'customer', user?.id ?? 'anon'],
    queryFn: getCustomerInfoSafe,
    enabled: sdkReady && isPurchasesConfigured(),
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
        queryClient.setQueryData(
          ['subscription', 'customer', user?.id ?? 'anon'],
          result.customerInfo,
        );
      }
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['menuScanQuota'] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restorePurchasesSafe,
    onSuccess: (result) => {
      if (result.customerInfo) {
        queryClient.setQueryData(
          ['subscription', 'customer', user?.id ?? 'anon'],
          result.customerInfo,
        );
      }
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['menuScanQuota'] });
    },
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['subscription'] }),
      queryClient.invalidateQueries({ queryKey: ['menuScanQuota'] }),
    ]);
  }, [queryClient]);

  const purchase = useCallback(
    async (pkg: PurchasesPackage) => {
      const result = await purchaseMutation.mutateAsync(pkg);
      if (result.cancelled) return { success: false, cancelled: true };
      if (result.error) return { success: false, cancelled: false, error: result.error };
      return { success: customerHasPro(result.customerInfo), cancelled: false };
    },
    [purchaseMutation],
  );

  const restore = useCallback(async () => {
    const result = await restoreMutation.mutateAsync();
    if (result.error) return { success: false, isPro: false, error: result.error };
    const pro = customerHasPro(result.customerInfo);
    return { success: true, isPro: pro };
  }, [restoreMutation]);

  const offerings = offeringsQuery.data ?? null;
  const customerInfo = customerQuery.data ?? null;
  const isPro = customerHasPro(customerInfo);

  const value = useMemo<SubscriptionContextType>(
    () => ({
      isPro,
      isReady: sdkReady,
      isLoading:
        !sdkReady ||
        customerQuery.isLoading ||
        offeringsQuery.isLoading ||
        purchaseMutation.isPending ||
        restoreMutation.isPending,
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
      customerQuery.isLoading,
      offeringsQuery.isLoading,
      purchaseMutation.isPending,
      restoreMutation.isPending,
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
