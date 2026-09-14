import { getActiveAccessToken, getStoredAuth } from './googleAuthService';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const FOLDER_NAME = 'Expense Tracker';
const CURRENT_BACKUP_FILENAME = 'current-backup.json';
const HISTORY_DIR_NAME = 'history';

const APP_DATA_FOLDER = 'appDataFolder';
const STORAGE_KEY = 'expense-drive-meta';

export interface DriveBackupMetadata {
  folderId: string;
  currentBackupFileId: string;
  historyFolderId: string;
  historyIndexFileId: string;
  history: BackupHistoryEntry[];
  lastBackupAt: string;
  lastBackupStatus: 'success' | 'failed' | 'pending';
  lastBackupError?: string;
}

export interface BackupHistoryEntry {
  id: string;
  name: string;
  date: string;
  size: number;
  status: 'success' | 'failed';
}

interface DriveFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime?: string;
}

async function driveRequest(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await fetch(`${DRIVE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorBody: any = {};
    try {
      errorBody = await response.json();
    } catch {
    }
    const errMsg = errorBody.error?.message || response.statusText || 'Drive API error';
    const error = new Error(errMsg) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = errorBody.error?.code;
    throw error;
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }

  return response.json();
}

export function getStoredDriveMeta(): DriveBackupMetadata | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DriveBackupMetadata;
  } catch {
    return null;
  }
}

export function saveDriveMeta(meta: DriveBackupMetadata): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

export function clearDriveMeta(): void {
  localStorage.removeItem(STORAGE_KEY);
}

async function getAccessToken(): Promise<string> {
  return getActiveAccessToken();
}

async function findFolder(accessToken: string, folderName: string): Promise<string | null> {
  const q = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${APP_DATA_FOLDER}' in parents`);
  const result = await driveRequest(
    `/files?q=${q}&fields=id,name&spaces=${APP_DATA_FOLDER}`,
    accessToken
  );
  const files = result?.files;
  if (files && files.length > 0) {
    return files[0].id;
  }
  return null;
}

async function createFolder(accessToken: string, folderName: string, parentFolderId?: string): Promise<string> {
  const body: Record<string, any> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    body.parents = [parentFolderId];
  }
  const result = await driveRequest('/files?fields=id,name', accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return result.id;
}

async function ensureFolder(accessToken: string, folderName: string): Promise<string> {
  const existing = await findFolder(accessToken, folderName);
  if (existing) return existing;
  return createFolder(accessToken, folderName);
}

async function findFileInFolder(
  accessToken: string,
  folderId: string,
  fileName: string
): Promise<DriveFile | null> {
  const q = encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`);
  const result = await driveRequest(
    `/files?q=${q}&fields=id,name,size,modifiedTime`,
    accessToken
  );
  const files = result?.files;
  if (files && files.length > 0) {
    return files[0];
  }
  return null;
}

async function listFilesInFolder(
  accessToken: string,
  folderId: string
): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const result = await driveRequest(
    `/files?q=${q}&fields=id,name,size,modifiedTime&orderBy=modifiedTime desc`,
    accessToken
  );
  return result?.files || [];
}

export async function ensureDriveFolder(): Promise<DriveBackupMetadata> {
  const accessToken = await getAccessToken();
  const auth = getStoredAuth();
  if (!auth) throw new Error('Not authenticated');

  const existingMeta = getStoredDriveMeta();

  if (existingMeta) {
    try {
      await driveRequest(
        `/files/${existingMeta.folderId}?fields=id`,
        accessToken
      );
      return existingMeta;
    } catch {
    }
  }

  const folderId = await ensureFolder(accessToken, FOLDER_NAME);
  const historyFolderId = await ensureFolder(accessToken, HISTORY_DIR_NAME);

  const currentFile = await createFile(
    accessToken,
    folderId,
    CURRENT_BACKUP_FILENAME,
    JSON.stringify({ version: 1, data: {} })
  );

  const historyIndexContent = JSON.stringify({ version: 1, history: [], updatedAt: new Date().toISOString() });
  const historyIndexFile = await createFile(
    accessToken,
    folderId,
    'backup-history-index.json',
    historyIndexContent,
    'application/json'
  );

  const meta: DriveBackupMetadata = {
    folderId,
    currentBackupFileId: currentFile,
    historyFolderId,
    historyIndexFileId: historyIndexFile,
    history: [],
    lastBackupAt: '',
    lastBackupStatus: 'pending',
  };

  saveDriveMeta(meta);
  return meta;
}

async function createFile(
  accessToken: string,
  folderId: string,
  name: string,
  content: string,
  mimeType = 'application/json'
): Promise<string> {
  const body = {
    name,
    parents: [folderId],
    mimeType,
  };

  const metadataResponse = await driveRequest(
    `/files?uploadType=metadata&fields=id`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  const boundary = '-------' + Date.now().toString(36);
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelim = '\r\n--' + boundary + '--';

  const multipart =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(body) +
    delimiter +
    'Content-Type: ' + mimeType + '\r\n\r\n' +
    content +
    closeDelim;

  const uploadResponse = await fetch(
    `${DRIVE_API_BASE}/files?uploadType=multipart&fields=id`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'multipart/related; boundary=' + boundary,
      },
      body: multipart,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Upload failed');
  }

  const data = await uploadResponse.json();
  return data.id || metadataResponse.id;
}

export async function updateFileContent(
  accessToken: string,
  fileId: string,
  content: string,
  mimeType = 'application/json'
): Promise<void> {
  await fetch(`${DRIVE_API_BASE}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': mimeType,
    },
    body: content,
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Failed to update file content');
    }
  });
}

export async function uploadCurrentBackup(backupJson: string): Promise<void> {
  const accessToken = await getAccessToken();
  const meta = getStoredDriveMeta();
  if (!meta) throw new Error('Drive folder not initialized');

  try {
    await driveRequest(`/files/${meta.currentBackupFileId}?fields=id`, accessToken);
    await updateFileContent(accessToken, meta.currentBackupFileId, backupJson);
  } catch {
    await createFile(accessToken, meta.folderId, CURRENT_BACKUP_FILENAME, backupJson);
    const current = getStoredDriveMeta();
    if (current) {
      const file = await findFileInFolder(accessToken, current.folderId, CURRENT_BACKUP_FILENAME);
      if (file) {
        current.currentBackupFileId = file.id;
        saveDriveMeta(current);
      }
    }
  }

  meta.lastBackupAt = new Date().toISOString();
  meta.lastBackupStatus = 'success';
  meta.lastBackupError = undefined;
  saveDriveMeta({ ...getStoredDriveMeta()!, lastBackupAt: meta.lastBackupAt, lastBackupStatus: 'success' });
}

export async function uploadHistoryBackup(backupJson: string, dateStr: string): Promise<BackupHistoryEntry | null> {
  const accessToken = await getAccessToken();
  const meta = getStoredDriveMeta();
  if (!meta) return null;

  const fileName = `backup-${dateStr}.json`;
  const fileId = await createFile(
    accessToken,
    meta.historyFolderId,
    fileName,
    backupJson
  );

  const fileInfo = await driveRequest(`/files/${fileId}?fields=id,name,size,modifiedTime`, accessToken);
  const entry: BackupHistoryEntry = {
    id: fileInfo.id,
    name: fileInfo.name,
    date: fileInfo.modifiedTime || new Date().toISOString(),
    size: parseInt(fileInfo.size || '0', 10),
    status: 'success',
  };

  const updatedHistory = [entry, ...meta.history];
  const updatedMeta = { ...meta, history: updatedHistory };
  saveDriveMeta(updatedMeta);
  await updateHistoryIndexFile(accessToken, updatedMeta);

  return entry;
}

async function updateHistoryIndexFile(accessToken: string, meta: DriveBackupMetadata): Promise<void> {
  const indexContent = JSON.stringify({
    version: 1,
    history: meta.history,
    updatedAt: new Date().toISOString(),
  });

  try {
    await updateFileContent(accessToken, meta.historyIndexFileId, indexContent, 'application/json');
  } catch {
    const result = await createFile(
      accessToken,
      meta.folderId,
      'backup-history-index.json',
      indexContent,
      'application/json'
    );
    const updatedMeta = { ...meta, historyIndexFileId: result };
    saveDriveMeta(updatedMeta);
  }
}

export async function downloadCurrentBackup(): Promise<string> {
  const accessToken = await getAccessToken();
  const meta = getStoredDriveMeta();
  if (!meta) throw new Error('Drive folder not initialized');

  const response = await fetch(`${DRIVE_API_BASE}/files/${meta.currentBackupFileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to download backup');
  }

  return response.text();
}

export async function downloadBackupById(fileId: string): Promise<string> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Failed to download backup');
  }
  return response.text();
}

export async function loadHistoryIndex(): Promise<BackupHistoryEntry[]> {
  const accessToken = await getAccessToken();
  const meta = getStoredDriveMeta();
  if (!meta) {
    return [];
  }

  try {
    await driveRequest(`/files/${meta.historyIndexFileId}?fields=id`, accessToken);
  } catch {
    const refreshed = await ensureDriveFolder();
    return refreshed.history || [];
  }

  if (meta.history && meta.history.length > 0) {
    return meta.history;
  }

  try {
    const content = await downloadBackupById(meta.historyIndexFileId);
    const parsed = JSON.parse(content);
    const history: BackupHistoryEntry[] = parsed.history || [];
    const updatedMeta = { ...meta, history };
    saveDriveMeta(updatedMeta);
    return history;
  } catch {
    return meta.history || [];
  }
}

export async function deleteHistoryEntry(fileId: string): Promise<void> {
  const accessToken = await getAccessToken();
  await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function deleteOldHistoryBackups(retentionCount: number): Promise<void> {
  const meta = getStoredDriveMeta();
  if (!meta || meta.history.length <= retentionCount) return;

  const toDelete = meta.history.slice(retentionCount);
  for (const entry of toDelete) {
    try {
      await deleteHistoryEntry(entry.id);
    } catch {
    }
  }

  const updatedHistory = meta.history.slice(0, retentionCount);
  const updatedMeta = { ...meta, history: updatedHistory };
  saveDriveMeta(updatedMeta);

  const accessToken = await getAccessToken();
  await updateHistoryIndexFile(accessToken, updatedMeta);
}

export async function cleanupOrphanedHistory(): Promise<void> {
  const accessToken = await getAccessToken();
  const meta = getStoredDriveMeta();
  if (!meta) return;

  try {
    const files = await listFilesInFolder(accessToken, meta.historyFolderId);
    const knownIds = new Set(meta.history.map((h) => h.id));
    for (const file of files) {
      if (!knownIds.has(file.id)) {
        try {
          await deleteHistoryEntry(file.id);
        } catch {
        }
      }
    }
  } catch {
  }
}

export async function testDriveConnection(): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    await driveRequest('/about?fields=kind', accessToken);
    return true;
  } catch {
    return false;
  }
}
