import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BackupState,
  updateBackupState,
  getBackupState,
  runBackup,
  pickBackupFolder,
  clearBackupState,
  BackupFormat,
  BackupFrequency,
  BackupStatus,
} from '../services/backupService';

export interface SettingsState {
  scanReceiptEnabled: boolean;
  payWithUpiEnabled: boolean;
  darkModeEnabled: boolean;
  appLockEnabled: boolean;
  walletFeatureEnabled: boolean;
  backup: BackupState;
  setScanReceiptEnabled: (enabled: boolean) => void;
  setPayWithUpiEnabled: (enabled: boolean) => void;
  setDarkModeEnabled: (enabled: boolean) => void;
  setAppLockEnabled: (enabled: boolean) => void;
  setWalletFeatureEnabled: (enabled: boolean) => void;
  setBackupFolder: (folderUri?: string, folderName?: string) => void;
  setBackupFormat: (format: BackupFormat) => void;
  setAutoBackupEnabled: (enabled: boolean) => void;
  setBackupFrequency: (frequency: BackupFrequency) => void;
  setBackupRetention: (count: number) => void;
  setBackupStatus: (status: BackupStatus, error?: string) => void;
  setLastBackupAt: (at?: string) => void;
  setDriveConnected: (connected: boolean, email?: string) => void;
  backupNow: (format?: BackupFormat) => Promise<{ json?: boolean; csv?: boolean }>;
  backupToDrive: () => Promise<{ success: boolean; error?: string }>;
  pickBackupFolder: () => Promise<{ folderUri?: string; folderName?: string; isWeb: boolean } | null>;
  clearBackup: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      scanReceiptEnabled: true,
      payWithUpiEnabled: true,
      darkModeEnabled: false,
      appLockEnabled: false,
      walletFeatureEnabled: true,
      backup: getBackupState(),

      setScanReceiptEnabled: (enabled) => set({ scanReceiptEnabled: enabled }),

      setPayWithUpiEnabled: (enabled) => set({ payWithUpiEnabled: enabled }),

      setDarkModeEnabled: (enabled) => set({ darkModeEnabled: enabled }),

      setAppLockEnabled: (enabled) => set({ appLockEnabled: enabled }),

      setWalletFeatureEnabled: (enabled) => set({ walletFeatureEnabled: enabled }),

      setBackupFolder: (folderUri, folderName) => {
        const current = get().backup;
        updateBackupState({ ...current, folderUri, folderName });
        set({ backup: getBackupState() });
      },

      setBackupFormat: (format) => {
        const current = get().backup;
        updateBackupState({ ...current, format });
        set({ backup: getBackupState() });
      },

      setAutoBackupEnabled: (enabled) => {
        const current = get().backup;
        updateBackupState({ ...current, autoBackupEnabled: enabled });
        set({ backup: getBackupState() });
      },

      setBackupFrequency: (frequency) => {
        const current = get().backup;
        updateBackupState({ ...current, backupFrequency: frequency });
        set({ backup: getBackupState() });
      },

      setBackupRetention: (count) => {
        const current = get().backup;
        updateBackupState({ ...current, backupRetention: count });
        set({ backup: getBackupState() });
      },

      setBackupStatus: (status, error) => {
        const current = get().backup;
        updateBackupState({
          ...current,
          backupStatus: status,
          backupError: error,
        });
        set({ backup: getBackupState() });
      },

      setLastBackupAt: (at) => {
        const current = get().backup;
        updateBackupState({ ...current, lastBackupAt: at });
        set({ backup: getBackupState() });
      },

      setDriveConnected: (connected, email) => {
        const current = get().backup;
        updateBackupState({
          ...current,
          driveConnected: connected,
          googleEmail: email,
        });
        set({ backup: getBackupState() });
      },

      backupNow: async (format) => {
        const result = await runBackup(format || get().backup.format);
        set({ backup: getBackupState() });
        return result;
      },

      backupToDrive: async () => {
        const current = get().backup;
        updateBackupState({ ...current, backupStatus: 'pending' });
        set({ backup: getBackupState() });

        try {
          const { runDriveBackup } = await import('../services/backupService');
          const result = await runDriveBackup();
          set({ backup: getBackupState() });
          if (result.success) {
            return { success: true };
          }
          return { success: false, error: result.error };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Backup failed';
          updateBackupState({
            ...get().backup,
            backupStatus: 'failed',
            backupError: errorMsg,
          });
          set({ backup: getBackupState() });
          return { success: false, error: errorMsg };
        }
      },

      pickBackupFolder: async () => {
        const result = await pickBackupFolder();
        if (result) {
          const current = get().backup;
          updateBackupState({
            ...current,
            folderUri: result.folderUri,
            folderName: result.folderName,
          });
          set({ backup: getBackupState() });
        }
        return result;
      },

      clearBackup: () => {
        clearBackupState();
        set({ backup: getBackupState() });
      },
    }),
    {
      name: 'expense-tracker-settings',
    }
  )
);
