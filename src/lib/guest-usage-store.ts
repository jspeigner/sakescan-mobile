import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@sakescan:guest_usage';
const FREE_LABEL_SCANS = 3;

interface GuestUsageState {
  labelScansUsed: number;
  isLoaded: boolean;
  canScanLabel: () => boolean;
  remainingFreeScans: () => number;
  incrementLabelScan: () => Promise<void>;
  resetUsage: () => Promise<void>;
  loadUsage: () => Promise<void>;
}

export const FREE_SCAN_LIMIT = FREE_LABEL_SCANS;

export const useGuestUsageStore = create<GuestUsageState>((set, get) => ({
  labelScansUsed: 0,
  isLoaded: false,

  canScanLabel: () => get().labelScansUsed < FREE_LABEL_SCANS,

  remainingFreeScans: () => Math.max(0, FREE_LABEL_SCANS - get().labelScansUsed),

  incrementLabelScan: async () => {
    const next = get().labelScansUsed + 1;
    set({ labelScansUsed: next });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ labelScansUsed: next }));
    } catch (e) {
      console.error('Failed to persist guest usage:', e);
    }
  },

  resetUsage: async () => {
    set({ labelScansUsed: 0 });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to reset guest usage:', e);
    }
  },

  loadUsage: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ labelScansUsed: parsed.labelScansUsed ?? 0, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },
}));
