import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_KEY = '@sakescan:notifications_enabled';

interface NotificationContextType {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);

  // Load saved notification preference
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
        if (saved !== null) {
          const enabled = JSON.parse(saved);
          setNotificationsEnabledState(enabled);
        }
      } catch (err) {
        console.error('Error loading notification preference:', err);
      }
    };
    loadPreference();
  }, []);

  const setNotificationsEnabled = async (enabled: boolean) => {
    try {
      setNotificationsEnabledState(enabled);
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(enabled));
      console.log(`[Notifications] ${enabled ? 'Enabled' : 'Disabled'}`);
    } catch (err) {
      console.error('Error saving notification preference:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{ notificationsEnabled, setNotificationsEnabled }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
