import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScannedSake {
  id: string; // Generated unique ID for each scan
  timestamp: string; // ISO timestamp
  imageUri?: string;
  sakeInfo: {
    name: string;
    nameJapanese?: string;
    brewery: string;
    type: string;
    subtype?: string;
    prefecture?: string;
    region?: string;
    description: string;
    tastingNotes?: string;
    foodPairings?: string[];
    riceVariety?: string;
    polishingRatio?: number;
    alcoholPercentage?: number;
    flavorProfile?: string[];
    servingTemperature?: string[];
  };
}

interface ScanHistoryState {
  scans: ScannedSake[];
  isLoaded: boolean;
  addScan: (scan: Omit<ScannedSake, 'id' | 'timestamp'>) => Promise<void>;
  removeScan: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  loadHistory: () => Promise<void>;
}

const STORAGE_KEY = '@sakescan:scan_history';

export const useScanHistoryStore = create<ScanHistoryState>((set, get) => ({
  scans: [],
  isLoaded: false,

  addScan: async (scan) => {
    const newScan: ScannedSake = {
      ...scan,
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    const updatedScans = [newScan, ...get().scans];
    set({ scans: updatedScans });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScans));
    } catch (error) {
      console.error('Failed to save scan to storage:', error);
    }
  },

  removeScan: async (id) => {
    const updatedScans = get().scans.filter((scan) => scan.id !== id);
    set({ scans: updatedScans });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScans));
    } catch (error) {
      console.error('Failed to remove scan from storage:', error);
    }
  },

  clearHistory: async () => {
    set({ scans: [] });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear scan history:', error);
    }
  },

  loadHistory: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const scans: ScannedSake[] = JSON.parse(stored);
        set({ scans, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('Failed to load scan history:', error);
      set({ isLoaded: true });
    }
  },
}));
