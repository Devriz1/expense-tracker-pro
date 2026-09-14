import { useState, useCallback } from 'react';
import { useGoogleAuth } from './useGoogleAuth';
import {
  ensureDriveFolder,
  getStoredDriveMeta,
  clearDriveMeta,
  testDriveConnection,
} from '../services/googleDriveService';
import { useSettingsStore } from '../store/useSettingsStore';

export function useGoogleDrive() {
  const { user, isAuthenticated, refresh } = useGoogleAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDriveConnected = useSettingsStore((state) => state.setDriveConnected);

  const connect = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Please sign in with Google first');
      return null;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await refresh();
      const meta = await ensureDriveFolder();
      setDriveConnected(true, user?.email);
      return meta;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to Google Drive';
      setError(msg);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [isAuthenticated, user, refresh, setDriveConnected]);

  const disconnect = useCallback(async () => {
    try {
      clearDriveMeta();
      setDriveConnected(false);
    } catch (err) {
      console.error('Failed to disconnect Google Drive', err);
    }
  }, [setDriveConnected]);

  const checkConnection = useCallback(async () => {
    try {
      const result = await testDriveConnection();
      return result;
    } catch {
      return false;
    }
  }, []);

  const driveMeta = getStoredDriveMeta();

  return {
    isConnected: !!getStoredDriveMeta(),
    driveMeta,
    isConnecting,
    error,
    connect,
    disconnect,
    checkConnection,
  };
}
