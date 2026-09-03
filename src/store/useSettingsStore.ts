import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsState {
  scanReceiptEnabled: boolean;
  payWithUpiEnabled: boolean;
  darkModeEnabled: boolean;
  appLockEnabled: boolean;
  setScanReceiptEnabled: (enabled: boolean) => void;
  setPayWithUpiEnabled: (enabled: boolean) => void;
  setDarkModeEnabled: (enabled: boolean) => void;
  setAppLockEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      scanReceiptEnabled: true,
      payWithUpiEnabled: true,
      darkModeEnabled: false,
      appLockEnabled: false,

      setScanReceiptEnabled: (enabled) => set({ scanReceiptEnabled: enabled }),

      setPayWithUpiEnabled: (enabled) => set({ payWithUpiEnabled: enabled }),

      setDarkModeEnabled: (enabled) => set({ darkModeEnabled: enabled }),

      setAppLockEnabled: (enabled) => set({ appLockEnabled: enabled }),
    }),
    {
      name: 'expense-tracker-settings',
    }
  )
);
