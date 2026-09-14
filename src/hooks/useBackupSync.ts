import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useGoogleAuth } from './useGoogleAuth';
import {
  collectAppData,
  createDriveBackupJson,
  runDriveBackup,
  shouldRunAutoBackup,
  getLocalDataTimestamp,
  updateBackupState,
  getBackupState,
} from '../services/backupService';
import { getStoredAuth } from '../services/googleAuthService';

export function useBackupSync() {
  const transactions = useStore((state) => state.transactions);
  const budgetLimits = useStore((state) => state.budgetLimits);
  const customCategories = useStore((state) => ({
    expense: state.customCategories.expense,
    income: state.customCategories.income,
  }));
  const filters = useStore((state) => state.filters);

  const backup = useSettingsStore((state) => state.backup);
  const setBackupStatus = useSettingsStore((state) => state.setBackupStatus);
  const setLastBackupAt = useSettingsStore((state) => state.setLastBackupAt);
  const { isAuthenticated } = useGoogleAuth();

  const getAppStateForBackup = useCallback(() => {
    return collectAppData({
      transactions,
      budgetLimits,
      customCategories,
      filters,
    });
  }, [transactions, budgetLimits, customCategories, filters]);

  const triggerManualBackup = useCallback(async () => {
    setBackupStatus('pending');
    try {
      const auth = getStoredAuth();
      if (!auth || !isAuthenticated) {
        throw new Error('Google authentication required for Drive backup');
      }

      const result = await runDriveBackup({
        googleId: auth.googleId,
        email: auth.email,
        name: auth.name,
        picture: auth.picture,
      });

      if (result.success) {
        setBackupStatus('success');
        setLastBackupAt(new Date().toISOString());
        return { success: true };
      } else {
        setBackupStatus('failed', result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Backup failed';
      setBackupStatus('failed', msg);
      return { success: false, error: msg };
    }
  }, [isAuthenticated, setBackupStatus, setLastBackupAt]);

  const checkAndRunAutoBackup = useCallback(async () => {
    const currentBackup = getBackupState();
    if (!currentBackup.autoBackupEnabled) return;
    if (!currentBackup.driveConnected) return;
    if (!isAuthenticated) return;

    if (!shouldRunAutoBackup(currentBackup.backupFrequency, currentBackup.lastBackupAt)) {
      return;
    }

    const now = Date.now();
    const localTimestamp = getLocalDataTimestamp();
    if (localTimestamp > now || localTimestamp === 0) {
      return;
    }

    try {
      const auth = getStoredAuth();
      if (!auth) return;

      updateBackupState({
        ...currentBackup,
        backupStatus: 'pending',
      });

      const result = await runDriveBackup({
        googleId: auth.googleId,
        email: auth.email,
        name: auth.name,
        picture: auth.picture,
      });

      if (result.success) {
        updateBackupState({
          ...currentBackup,
          backupStatus: 'success',
          backupError: undefined,
          lastBackupAt: new Date().toISOString(),
        });
      } else {
        updateBackupState({
          ...currentBackup,
          backupStatus: 'failed',
          backupError: result.error,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Auto backup failed';
      updateBackupState({
        ...currentBackup,
        backupStatus: 'failed',
        backupError: msg,
      });
    }
  }, [isAuthenticated]);

  const collectBackupData = useCallback(() => {
    return getAppStateForBackup();
  }, [getAppStateForBackup]);

  const createBackupJson = useCallback(() => {
    const auth = getStoredAuth();
    if (auth) {
      return createDriveBackupJson({
        googleId: auth.googleId,
        email: auth.email,
        name: auth.name,
        picture: auth.picture,
      });
    }
    return createDriveBackupJson();
  }, []);

  return {
    backup,
    triggerManualBackup,
    checkAndRunAutoBackup,
    collectBackupData,
    createBackupJson,
    isDriveConnected: backup.driveConnected,
  };
}
