import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { createDropboxService } from '../services/dropboxService';

export default function SettingsPage() {
  const [userId] = useState(() => localStorage.getItem('dropbox_user_id') || crypto.randomUUID());
  const [service, setService] = useState<ReturnType<typeof createDropboxService> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    localStorage.setItem('dropbox_user_id', userId);
    const svc = createDropboxService(userId);
    setService(svc);

    fetch('/api/dropbox/health')
      .then((res) => {
        if (res.ok) setBackendStatus('online');
        else setBackendStatus('offline');
      })
      .catch(() => setBackendStatus('offline'));
  }, [userId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dropbox_connected')) {
      setIsConnected(true);
      setSuccess('Connected to Dropbox');
      window.history.replaceState({}, '', '/settings');
    }
    if (params.get('dropbox_error')) {
      setError(params.get('dropbox_error') || 'Connection failed');
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  const handleConnect = async () => {
    if (!service) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await service.connect();
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Dropbox');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!service) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await service.disconnect();
      setIsConnected(false);
      setSuccess('Disconnected from Dropbox');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect from Dropbox');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!service) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const backupData = {
        transactions: JSON.parse(localStorage.getItem('expense-tracker-transactions') || '[]'),
        settings: JSON.parse(localStorage.getItem('expense-tracker-settings') || '{}'),
      };

      await service.backup(backupData);
      setSuccess('Backup successful');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
          {isConnected ? (
            <Cloud className="w-5 h-5 text-indigo-600" />
          ) : (
            <CloudOff className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Dropbox Backup</h3>
          <p className="text-sm text-gray-500">Backup and restore your data</p>
        </div>
      </div>

      {backendStatus === 'offline' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-sm">
          Backend server is not reachable at <code>localhost:3000</code>. Make sure <code>node server/server.js</code> is running.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="space-y-3">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                Connect Dropbox
              </>
            )}
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-900">Connected</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Disconnect
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleBackup}
                disabled={isLoading}
                className="btn btn-primary"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
                Back Up Now
              </button>

              <button
                onClick={() => setError('Restore is not available yet')}
                disabled={isLoading}
                className="btn btn-ghost border border-gray-300"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Restore
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">
          Backups are saved to your Dropbox app folder as backup_latest.json.
          Restore will replace all local data with the backed up data.
        </p>
      </div>
    </div>
  );
}
