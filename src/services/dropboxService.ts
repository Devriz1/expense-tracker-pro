const API_BASE = '/api/dropbox';

export interface DropboxService {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  backup: (data: unknown) => Promise<boolean>;
}

export function createDropboxService(userId: string): DropboxService {
  let isConnected = false;
  let isLoading = false;
  let error: string | null = null;

  const getHeaders = () => ({
    'Content-Type': 'application/json',
  });

  const connect = async (): Promise<void> => {
    isLoading = true;
    error = null;

    try {
      const res = await fetch(`${API_BASE}/auth-url?userId=${encodeURIComponent(userId)}`);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned invalid response: ${text.slice(0, 200)}`);
      }
      if (!data.url) {
        throw new Error('Failed to get auth URL');
      }
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to Dropbox';
      error = message;
      throw new Error(message);
    } finally {
      isLoading = false;
    }
  };

  const disconnect = async (): Promise<void> => {
    isLoading = true;
    error = null;

    try {
      const res = await fetch(`${API_BASE}/disconnect`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (data.success) {
        isConnected = false;
      } else {
        throw new Error(data.error || 'Failed to disconnect');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to disconnect from Dropbox';
      throw error;
    } finally {
      isLoading = false;
    }
  };

  const backup = async (data: unknown): Promise<boolean> => {
    isLoading = true;
    error = null;

    try {
      const res = await fetch(`${API_BASE}/backup`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId, backupData: data }),
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || 'Backup failed');
      }

      isConnected = true;
      return true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Backup failed';
      throw error;
    } finally {
      isLoading = false;
    }
  };

  return {
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    backup,
  };
}
