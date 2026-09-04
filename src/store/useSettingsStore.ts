import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_REMINDER_TIMES = ['10:00', '14:00', '18:00'];

export interface SettingsState {
  scanReceiptEnabled: boolean;
  payWithUpiEnabled: boolean;
  darkModeEnabled: boolean;
  appLockEnabled: boolean;
  dailyReminderEnabled: boolean;
  reminderTimes: string[];
  setScanReceiptEnabled: (enabled: boolean) => void;
  setPayWithUpiEnabled: (enabled: boolean) => void;
  setDarkModeEnabled: (enabled: boolean) => void;
  setAppLockEnabled: (enabled: boolean) => void;
  setDailyReminderEnabled: (enabled: boolean) => void;
  setReminderTimes: (times: string[]) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      scanReceiptEnabled: true,
      payWithUpiEnabled: true,
      darkModeEnabled: false,
      appLockEnabled: false,
      dailyReminderEnabled: false,
      reminderTimes: DEFAULT_REMINDER_TIMES,

      setScanReceiptEnabled: (enabled) => set({ scanReceiptEnabled: enabled }),

      setPayWithUpiEnabled: (enabled) => set({ payWithUpiEnabled: enabled }),

      setDarkModeEnabled: (enabled) => set({ darkModeEnabled: enabled }),

      setAppLockEnabled: (enabled) => set({ appLockEnabled: enabled }),

      setDailyReminderEnabled: (enabled) => set({ dailyReminderEnabled: enabled }),

      setReminderTimes: (times) => set({ reminderTimes: times }),
    }),
    {
      name: 'expense-tracker-settings',
    }
  )
);
