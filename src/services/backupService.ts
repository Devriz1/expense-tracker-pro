import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import type { GoogleAuthState } from './googleAuthService';

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => Promise<boolean>;
    };
  }
}

export type BackupFormat = 'json' | 'csv' | 'both';
export type BackupFrequency = 'manual' | 'hourly7' | 'daily' | 'weekly';
export type BackupStatus = 'idle' | 'success' | 'failed' | 'pending';

export interface AppDataSnapshot {
  transactions: any[];
  budgetLimits: Record<string, number>;
  customCategories: { expense: string[]; income: string[] };
  filters?: any;
  people: any[];
  pendingPayments: any[];
  settings: Record<string, any>;
}

export interface DriveBackupJson {
  version: string;
  backupDate: string;
  app: string;
  user?: {
    googleId: string;
    email: string;
    name: string;
    picture: string;
  };
  data: AppDataSnapshot;
}

export interface BackupState {
  folderUri?: string;
  folderName?: string;
  format: BackupFormat;
  autoBackupEnabled: boolean;
  lastBackupAt?: string;
  backupFrequency: BackupFrequency;
  backupRetention: number;
  backupStatus: BackupStatus;
  backupError?: string;
  driveConnected: boolean;
  googleEmail?: string;
}

function getTransactions() {
  try {
    const raw = localStorage.getItem('expense-tracker-transactions');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getZustandStoreData(): { transactions: any[]; budgetLimits: Record<string, number> } {
  try {
    const raw = localStorage.getItem('expense-tracker-storage');
    if (!raw) {
      const legacy = getTransactions();
      return { transactions: legacy, budgetLimits: {} };
    }
    const parsed = JSON.parse(raw);
    const state = parsed.state || parsed;
    return {
      transactions: state.transactions || getTransactions(),
      budgetLimits: state.budgetLimits || {},
    };
  } catch {
    const legacy = getTransactions();
    return { transactions: legacy, budgetLimits: {} };
  }
}

function getZustandSettingsData(): Record<string, any> {
  try {
    const raw = localStorage.getItem('expense-tracker-settings');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const state = parsed.state || parsed;
    return state || {};
  } catch {
    return {};
  }
}

function getPeopleEntries(): any[] {
  try {
    const raw = localStorage.getItem('expense-tracker-people');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getPendingPayments(): any[] {
  try {
    const raw = localStorage.getItem('expense-tracker-pending-payments');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getCustomCategories(): { expense: string[]; income: string[] } {
  return { expense: [], income: [] };
}

export function collectAppData(overrides?: {
  transactions?: any[];
  budgetLimits?: Record<string, number>;
  customCategories?: { expense: string[]; income: string[] };
  filters?: any;
}): AppDataSnapshot {
  const zustandData = getZustandStoreData();
  const settingsData = getZustandSettingsData();

  const transactions = overrides?.transactions ?? zustandData.transactions;
  const budgetLimits = overrides?.budgetLimits ?? zustandData.budgetLimits;
  const customCategories = overrides?.customCategories ?? getCustomCategories();
  const filters = overrides?.filters;

  const { backup, ...appSettings } = settingsData;

  return {
    transactions,
    budgetLimits,
    customCategories,
    filters,
    people: getPeopleEntries(),
    pendingPayments: getPendingPayments(),
    settings: appSettings,
  };
}

export function createDriveBackupJson(
  user?: Partial<GoogleAuthState>,
  overrides?: { transactions?: any[]; budgetLimits?: Record<string, number> }
): string {
  const appData = collectAppData(overrides);
  const backup: DriveBackupJson = {
    version: '1.0.0',
    backupDate: new Date().toISOString(),
    app: 'Expense Tracker Pro',
    user: user
      ? {
          googleId: user.googleId || '',
          email: user.email || '',
          name: user.name || '',
          picture: user.picture || '',
        }
      : undefined,
    data: appData,
  };
  return JSON.stringify(backup, null, 2);
}

export function getLocalDataTimestamp(): number {
  try {
    const raw = localStorage.getItem('expense-tracker-storage');
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    const state = parsed.state || parsed;
    if (state.transactions && state.transactions.length > 0) {
      const latest = Math.max(...state.transactions.map((t: any) => t.createdAt || t.updatedAt || 0));
      return latest;
    }
  } catch {
  }
  return 0;
}

export function shouldRunAutoBackup(
  frequency: BackupFrequency,
  lastBackupAt?: string
): boolean {
  if (frequency === 'manual') return false;

  const now = Date.now();
  let intervalMs: number;

  if (frequency === 'hourly7') {
    intervalMs = 7 * 60 * 60 * 1000;
  } else if (frequency === 'daily') {
    intervalMs = 24 * 60 * 60 * 1000;
  } else {
    intervalMs = 7 * 24 * 60 * 60 * 1000;
  }

  if (!lastBackupAt) return true;

  const lastTime = new Date(lastBackupAt).getTime();
  if (isNaN(lastTime)) return true;

  return now - lastTime >= intervalMs;
}

export function createLocalSafetyBackup(): string | null {
  try {
    const snapshot = collectAppData();
    const safetyBackup = {
      version: '1.0.0',
      backupDate: new Date().toISOString(),
      app: 'Expense Tracker Pro',
      data: snapshot,
    };
    const content = JSON.stringify(safetyBackup, null, 2);
    localStorage.setItem('expense-tracker-safety-backup', content);
    return content;
  } catch (err) {
    console.error('Failed to create safety backup', err);
    return null;
  }
}

export function getSafetyBackup(): string | null {
  try {
    return localStorage.getItem('expense-tracker-safety-backup');
  } catch {
    return null;
  }
}

function generateJsonBackup() {
  const zustandData = getZustandStoreData();
  return JSON.stringify({
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: { transactions: zustandData.transactions },
  }, null, 2);
}

function generateCsvBackup() {
  const zustandData = getZustandStoreData();
  const transactions = zustandData.transactions;
  const headers = ['Date', 'Type', 'Category', 'Amount', 'Payment Method', 'Note'];
  const rows = transactions.map((t: any) => [
    new Date(t.date).toLocaleDateString(),
    t.type,
    t.category,
    t.amount,
    t.paymentMethod || '',
    t.note || '',
  ]);
  return [headers, ...rows].map((r: string[]) => r.join(',')).join('\n');
}

async function writeToMobileFolder(fileName: string, content: string, folderPath?: string) {
  const basePath = folderPath || 'ExpenseTrackerBackups';
  const folderPathFull = `${basePath}/${fileName}`;
  
  try {
    await Filesystem.writeFile({
      path: folderPathFull,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
  } catch (err) {
    // If writing to custom folder fails, fall back to default folder
    const fallbackPath = `ExpenseTrackerBackups/${fileName}`;
    await Filesystem.writeFile({
      path: fallbackPath,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
  }
}

let webDirectoryHandle: FileSystemDirectoryHandle | null = null;

export function isWebPlatform(): boolean {
  const w = window as any;
  if (w.Capacitor && typeof w.Capacitor.isPlatformWeb === 'function') {
    return !!w.Capacitor.isPlatformWeb();
  }
  if (w.Capacitor && typeof w.Capacitor.isNativePlatform === 'function') {
    try {
      const result = w.Capacitor.isNativePlatform();
      if (result && typeof result.then === 'function') {
        return false;
      }
      return !result;
    } catch {
      return false;
    }
  }
  return true;
}

async function pickWebFolder(): Promise<{ name: string } | null> {
  try {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker();
        webDirectoryHandle = handle;
        return { name: handle.name };
      } catch (err) {
        console.warn('showDirectoryPicker failed', err);
      }
    }

    return null;
  } catch (err) {
    console.error('Failed to pick web folder', err);
    webDirectoryHandle = null;
    return null;
  }
}

async function writeToWebFolder(fileName: string, content: string) {
  if (!webDirectoryHandle) throw new Error('No web folder selected');
  const fileHandle = await webDirectoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function ensureWebDirectoryHandle(): Promise<boolean> {
  if (webDirectoryHandle) return true;

  const savedFolderName = localStorage.getItem('expense-backup-folder-name');
  if (!savedFolderName) return false;

  if ('showDirectoryPicker' in window) {
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      webDirectoryHandle = handle;
      return true;
    } catch (err) {
      console.warn('Failed to re-acquire web folder handle:', err);
      return false;
    }
  }

  return false;
}

function downloadBlob(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Use Web Share API to share a file on mobile browsers.
 * Triggers the native share sheet where users can save to Files, Drive, etc.
 * Returns true if the share was attempted, false if not supported.
 */
async function shareViaWebApi(fileName: string, content: string, mimeType: string): Promise<boolean> {
  if (!navigator.share) return false;

  try {
    const file = new File([content], fileName, { type: mimeType });
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      return false;
    }
    await navigator.share({
      files: [file],
      title: 'Backup Data',
      text: 'Save your expense backup',
    });
    return true;
  } catch (err) {
    // User cancelled or share failed
    console.warn('Web Share API failed:', err);
    return false;
  }
}

export async function pickBackupFolder(): Promise<{ folderUri?: string; folderName?: string; isWeb: boolean } | null> {
  const isWeb = isWebPlatform();

  if (!isWeb) {
    try {
      const result = await FilePicker.pickDirectory();
      const folderName = result.path.split('/').pop() || 'Selected Folder';
      localStorage.setItem('expense-backup-folder-name', folderName);
      localStorage.setItem('expense-backup-folder-uri', result.path);
      return { folderUri: result.path, folderName, isWeb: false };
    } catch (err) {
      console.error('Failed to pick backup folder', err);
      return { folderName: 'Documents/ExpenseTrackerBackups', isWeb: false };
    }
  }

  const result = await pickWebFolder();
  if (result) {
    return { folderName: result.name, isWeb: true };
  }
  return null;
}

async function deleteOldBackupFiles(fileName: string, folderPath?: string) {
  const isWeb = isWebPlatform();
  const basePath = folderPath || 'ExpenseTrackerBackups';

  if (!isWeb) {
    try {
      const files = await Filesystem.readdir({
        path: basePath,
        directory: Directory.Documents,
      });

      for (const entry of files.files) {
        if (entry.name !== fileName) {
          try {
            await Filesystem.deleteFile({
              path: `${basePath}/${entry.name}`,
              directory: Directory.Documents,
            });
          } catch (err) {
            console.warn('Failed to delete old backup:', entry.name, err);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to list backup folder for cleanup', err);
    }
  } else if (webDirectoryHandle) {
    try {
      const entries = (webDirectoryHandle as any).entries ? (webDirectoryHandle as any).entries() : null;
      if (entries) {
        for await (const [name, handle] of entries) {
          if (name !== fileName) {
            try {
              await handle.delete();
            } catch (err) {
              console.warn('Failed to delete old backup:', name, err);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to list web folder for cleanup', err);
    }
  }
}

export async function runBackup(format: BackupFormat = 'both'): Promise<{ json?: boolean; csv?: boolean }> {
  const results: { json?: boolean; csv?: boolean } = {};
  const isWeb = isWebPlatform();
  const savedFolderName = localStorage.getItem('expense-backup-folder-name');
  const savedFolderUri = localStorage.getItem('expense-backup-folder-uri') ?? undefined;

  if (isWeb && !webDirectoryHandle && !savedFolderName) {
    throw new Error('Please select a backup folder first');
  }

  if (isWeb && !webDirectoryHandle && savedFolderName) {
    await ensureWebDirectoryHandle();
  }

  if (format === 'json' || format === 'both') {
    const json = generateJsonBackup();
    const fileName = 'current-backup.json';

    if (!isWeb) {
      await deleteOldBackupFiles(fileName, savedFolderUri);
    } else if (webDirectoryHandle) {
      await deleteOldBackupFiles(fileName);
    }

    if (isWeb) {
      if (webDirectoryHandle) {
        await writeToWebFolder(fileName, json);
      } else if (savedFolderName) {
        await downloadBlob(fileName, json, 'application/json');
      }
    } else {
      // Mobile: try Web Share API first, fall back to Documents folder
      const shared = await shareViaWebApi(fileName, json, 'application/json');
      if (!shared) {
        await writeToMobileFolder(fileName, json, savedFolderUri);
      }
    }

    results.json = true;
  }

  if (format === 'csv' || format === 'both') {
    const csv = generateCsvBackup();
    const fileName = 'current-backup.csv';

    if (!isWeb) {
      await deleteOldBackupFiles(fileName, savedFolderUri);
    } else if (webDirectoryHandle) {
      await deleteOldBackupFiles(fileName);
    }

    if (isWeb) {
      if (webDirectoryHandle) {
        await writeToWebFolder(fileName, csv);
      } else if (savedFolderName) {
        await downloadBlob(fileName, csv, 'text/csv');
      }
    } else {
      // Mobile: try Web Share API first, fall back to Documents folder
      const shared = await shareViaWebApi(fileName, csv, 'text/csv');
      if (!shared) {
        await writeToMobileFolder(fileName, csv, savedFolderUri);
      }
    }

    results.csv = true;
  }

  const now = new Date().toISOString();
  localStorage.setItem('expense-last-backup-at', now);

  return results;
}

export function getBackupState(): BackupState {
  return {
    folderUri: localStorage.getItem('expense-backup-folder-uri') || undefined,
    folderName: localStorage.getItem('expense-backup-folder-name') || undefined,
    format: (localStorage.getItem('expense-backup-format') as BackupFormat) || 'both',
    autoBackupEnabled: localStorage.getItem('expense-backup-auto') === 'true',
    lastBackupAt: localStorage.getItem('expense-last-backup-at') || undefined,
    backupFrequency: (localStorage.getItem('expense-backup-frequency') as BackupFrequency) || 'daily',
    backupRetention: parseInt(localStorage.getItem('expense-backup-retention') || '30', 10),
    backupStatus: (localStorage.getItem('expense-backup-status') as BackupStatus) || 'idle',
    backupError: localStorage.getItem('expense-backup-error') || undefined,
    driveConnected: localStorage.getItem('expense-drive-connected') === 'true',
    googleEmail: localStorage.getItem('expense-google-email') || undefined,
  };
}

export function updateBackupState(partial: Partial<BackupState>) {
  if (partial.folderUri !== undefined) {
    if (partial.folderUri) {
      localStorage.setItem('expense-backup-folder-uri', partial.folderUri);
    } else {
      localStorage.removeItem('expense-backup-folder-uri');
    }
  }

  if (partial.folderName !== undefined) {
    if (partial.folderName) {
      localStorage.setItem('expense-backup-folder-name', partial.folderName);
    } else {
      localStorage.removeItem('expense-backup-folder-name');
    }
  }

  if (partial.format !== undefined) {
    localStorage.setItem('expense-backup-format', partial.format);
  }

  if (partial.autoBackupEnabled !== undefined) {
    localStorage.setItem('expense-backup-auto', String(partial.autoBackupEnabled));
  }

  if (partial.lastBackupAt !== undefined) {
    if (partial.lastBackupAt) {
      localStorage.setItem('expense-last-backup-at', partial.lastBackupAt);
    } else {
      localStorage.removeItem('expense-last-backup-at');
    }
  }

  if (partial.backupFrequency !== undefined) {
    localStorage.setItem('expense-backup-frequency', partial.backupFrequency);
  }

  if (partial.backupRetention !== undefined) {
    localStorage.setItem('expense-backup-retention', String(partial.backupRetention));
  }

  if (partial.backupStatus !== undefined) {
    localStorage.setItem('expense-backup-status', partial.backupStatus);
  }

  if (partial.backupError !== undefined) {
    if (partial.backupError) {
      localStorage.setItem('expense-backup-error', partial.backupError);
    } else {
      localStorage.removeItem('expense-backup-error');
    }
  }

  if (partial.driveConnected !== undefined) {
    localStorage.setItem('expense-drive-connected', String(partial.driveConnected));
  }

  if (partial.googleEmail !== undefined) {
    if (partial.googleEmail) {
      localStorage.setItem('expense-google-email', partial.googleEmail);
    } else {
      localStorage.removeItem('expense-google-email');
    }
  }
}

export function clearBackupState() {
  localStorage.removeItem('expense-backup-folder-uri');
  localStorage.removeItem('expense-backup-folder-name');
  localStorage.removeItem('expense-backup-format');
  localStorage.removeItem('expense-backup-auto');
  localStorage.removeItem('expense-last-backup-at');
  localStorage.removeItem('expense-backup-frequency');
  localStorage.removeItem('expense-backup-retention');
  localStorage.removeItem('expense-backup-status');
  localStorage.removeItem('expense-backup-error');
  localStorage.removeItem('expense-drive-connected');
  localStorage.removeItem('expense-google-email');
  webDirectoryHandle = null;
}

export async function runDriveBackup(
  userAuth?: Partial<GoogleAuthState>,
  dataOverrides?: { transactions?: any[]; budgetLimits?: Record<string, number> }
): Promise<{ success: boolean; fileName?: string; error?: string; historyEntry?: any }> {
  try {
    const { uploadDropboxBackup, getStoredDropboxAuth, startDropboxAuth } = await import('./dropboxService');

    const auth = userAuth || getStoredDropboxAuth();
    if (!auth) {
      startDropboxAuth();
      throw new Error('Not authenticated with Dropbox. Redirecting to sign in...');
    }

    const backupJson = createDriveBackupJson(auth as any, dataOverrides);
    const result = await uploadDropboxBackup(backupJson, '/backup.json');

    if (!result.success) {
      updateBackupState({
        backupStatus: 'failed',
        backupError: result.error,
      });
      return { success: false, error: result.error };
    }

    const now = new Date().toISOString();
    updateBackupState({
      lastBackupAt: now,
      backupStatus: 'success',
      backupError: undefined,
      driveConnected: true,
    });

    return { success: true, fileName: result.fileName };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Dropbox backup failed';
    updateBackupState({
      backupStatus: 'failed',
      backupError: errorMsg,
    });

    return { success: false, error: errorMsg };
  }
}