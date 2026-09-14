import type { DriveBackupJson } from './backupService';
import {
  getStoredAuth,
} from './googleAuthService';
import {
  downloadCurrentBackup,
  downloadBackupById,
  loadHistoryIndex,
  type BackupHistoryEntry,
  getStoredDriveMeta,
} from './googleDriveService';
import { createLocalSafetyBackup, getSafetyBackup } from './backupService';

const BACKUP_VERSION = '1.0.0';

export type RestoreStrategy = 'replace' | 'merge';

export interface RestoreResult {
  success: boolean;
  message: string;
  error?: string;
  backupDate?: string;
  backupSize?: number;
}

export interface RestoreValidation {
  valid: boolean;
  version?: string;
  backupDate?: string;
  app?: string;
  error?: string;
}

export function validateBackup(jsonString: string): RestoreValidation {
  try {
    const data = JSON.parse(jsonString) as DriveBackupJson;

    if (!data.version) {
      return { valid: false, error: 'Backup version not found' };
    }

    if (!data.data) {
      return { valid: false, error: 'Backup data section not found' };
    }

    if (!data.app) {
      return { valid: false, error: 'Backup app name not found' };
    }

    return {
      valid: true,
      version: data.version,
      backupDate: data.backupDate,
      app: data.app,
    };
  } catch {
    return { valid: false, error: 'Invalid JSON format' };
  }
}

export async function fetchBackupFromDrive(): Promise<string> {
  const auth = getStoredAuth();
  if (!auth) {
    throw new Error('Not authenticated with Google');
  }

  const meta = getStoredDriveMeta();
  if (!meta) {
    throw new Error('Google Drive backup not configured');
  }

  return downloadCurrentBackup();
}

export async function fetchBackupFromHistory(fileId: string): Promise<string> {
  const auth = getStoredAuth();
  if (!auth) {
    throw new Error('Not authenticated with Google');
  }

  return downloadBackupById(fileId);
}

export async function fetchBackupHistory(): Promise<BackupHistoryEntry[]> {
  const meta = getStoredDriveMeta();
  if (!meta) return [];
  return loadHistoryIndex();
}

export function performRestore(
  backupJson: string,
  strategy: RestoreStrategy = 'replace'
): RestoreResult {
  const validation = validateBackup(backupJson);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || 'Invalid backup',
    };
  }

  if (validation.version !== BACKUP_VERSION) {
    return {
      success: false,
      message: `Unsupported backup version: ${validation.version}`,
    };
  }

  let backupData: DriveBackupJson;
  try {
    backupData = JSON.parse(backupJson);
  } catch {
    return {
      success: false,
      message: 'Failed to parse backup data',
    };
  }

  const safetyBackup = getSafetyBackup();
  if (!safetyBackup) {
    const created = createLocalSafetyBackup();
    if (!created) {
      return {
        success: false,
        message: 'Failed to create safety backup before restore. Restore cancelled.',
      };
    }
  }

  try {
    const data = backupData.data;

    if (strategy === 'replace') {
      writeTransactions(data.transactions);
      writeBudgetLimits(data.budgetLimits);
      writePeople(data.people);
      writePendingPayments(data.pendingPayments);
      writeSettings(data.settings);
    } else {
      mergeTransactions(data.transactions);
      mergeBudgetLimits(data.budgetLimits);
      mergePeople(data.people);
      if (data.pendingPayments && data.pendingPayments.length > 0) {
        writePendingPayments(data.pendingPayments);
      }
      if (data.settings) {
        mergeSettings(data.settings);
      }
    }

    localStorage.setItem('expense-tracker-local-data-timestamp', Date.now().toString());

    return {
      success: true,
      message: 'Data restored successfully',
      backupDate: backupData.backupDate,
      backupSize: backupJson.length,
    };
  } catch (err) {
    const safety = getSafetyBackup();
    if (safety) {
      restoreFromSafetyBackup(safety);
    }
    return {
      success: false,
      message: `Restore failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

function writeTransactions(transactions: any[]): void {
  const zustandKey = 'expense-tracker-storage';
  let existing: any = {};
  try {
    const raw = localStorage.getItem(zustandKey);
    if (raw) existing = JSON.parse(raw);
  } catch {
  }
  existing = {
    ...existing,
    state: {
      ...existing.state,
      transactions: transactions,
    },
  };
  if (existing.version !== undefined) existing.version = existing.version;
  localStorage.setItem(zustandKey, JSON.stringify(existing));
}

function writeBudgetLimits(budgetLimits: Record<string, number>): void {
  const zustandKey = 'expense-tracker-storage';
  let existing: any = {};
  try {
    const raw = localStorage.getItem(zustandKey);
    if (raw) existing = JSON.parse(raw);
  } catch {
  }
  existing = {
    ...existing,
    state: {
      ...existing.state,
      budgetLimits: budgetLimits,
    },
  };
  localStorage.setItem(zustandKey, JSON.stringify(existing));
}

function mergeTransactions(incoming: any[]): void {
  const zustandKey = 'expense-tracker-storage';
  let existing: any = {};
  try {
    const raw = localStorage.getItem(zustandKey);
    if (raw) existing = JSON.parse(raw);
  } catch {
  }

  const currentTransactions: any[] = existing.state?.transactions || [];
  const existingIds = new Set(currentTransactions.map((t) => t.id));
  const merged = [...currentTransactions];

  for (const tx of incoming) {
    if (!existingIds.has(tx.id)) {
      merged.push(tx);
      existingIds.add(tx.id);
    }
  }

  existing = {
    ...existing,
    state: {
      ...existing.state,
      transactions: merged,
    },
  };
  localStorage.setItem(zustandKey, JSON.stringify(existing));
}

function mergeBudgetLimits(incoming: Record<string, number>): void {
  const zustandKey = 'expense-tracker-storage';
  let existing: any = {};
  try {
    const raw = localStorage.getItem(zustandKey);
    if (raw) existing = JSON.parse(raw);
  } catch {
  }

  const currentLimits = existing.state?.budgetLimits || {};
  const merged = { ...currentLimits, ...incoming };

  existing = {
    ...existing,
    state: {
      ...existing.state,
      budgetLimits: merged,
    },
  };
  localStorage.setItem(zustandKey, JSON.stringify(existing));
}

function writePeople(people: any[]): void {
  localStorage.setItem('expense-tracker-people', JSON.stringify(people));
}

function mergePeople(incoming: any[]): void {
  try {
    const raw = localStorage.getItem('expense-tracker-people');
    const current: any[] = raw ? JSON.parse(raw) : [];
    const existingIds = new Set(current.map((p) => p.id));
    const merged = [...current];
    for (const entry of incoming) {
      if (!existingIds.has(entry.id)) {
        merged.push(entry);
        existingIds.add(entry.id);
      }
    }
    localStorage.setItem('expense-tracker-people', JSON.stringify(merged));
  } catch {
  }
}

function writePendingPayments(payments: any[]): void {
  localStorage.setItem('expense-tracker-pending-payments', JSON.stringify(payments));
}

function writeSettings(settings: Record<string, any>): void {
  const settingsKey = 'expense-tracker-settings';
  let existing: any = {};
  try {
    const raw = localStorage.getItem(settingsKey);
    if (raw) existing = JSON.parse(raw);
  } catch {
  }

  const backupBackupState = existing.state?.backup;

  existing = {
    ...existing,
    state: {
      ...existing.state,
      ...settings,
      backup: backupBackupState,
    },
  };
  localStorage.setItem(settingsKey, JSON.stringify(existing));
}

function mergeSettings(incoming: Record<string, any>): void {
  const settingsKey = 'expense-tracker-settings';
  let existing: any = {};
  try {
    const raw = localStorage.getItem(settingsKey);
    if (raw) existing = JSON.parse(raw);
  } catch {
  }

  const backupBackupState = existing.state?.backup;

  existing = {
    ...existing,
    state: {
      ...existing.state,
      ...incoming,
      backup: backupBackupState,
    },
  };
  localStorage.setItem(settingsKey, JSON.stringify(existing));
}

function restoreFromSafetyBackup(safetyJson: string): void {
  try {
    const data = JSON.parse(safetyJson) as DriveBackupJson;
    if (data.data) {
      writeTransactions(data.data.transactions);
      writeBudgetLimits(data.data.budgetLimits);
      writePeople(data.data.people);
      writePendingPayments(data.data.pendingPayments);
      if (data.data.settings) {
        writeSettings(data.data.settings);
      }
    }
  } catch {
  }
}
