import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsState {
  scanReceiptEnabled: boolean;
  payWithUpiEnabled: boolean;
  setScanReceiptEnabled: (enabled: boolean) => void;
  setPayWithUpiEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      scanReceiptEnabled: true,
      payWithUpiEnabled: true,

      setScanReceiptEnabled: (enabled) => set({ scanReceiptEnabled: enabled }),

      setPayWithUpiEnabled: (enabled) => set({ payWithUpiEnabled: enabled }),
    }),
    {
      name: 'expense-tracker-settings',
    }
  )
);
