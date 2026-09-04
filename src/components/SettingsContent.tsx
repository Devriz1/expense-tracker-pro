import { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { getStoredAuth, clearStoredAuth, startDropboxAuth, uploadToDropbox, downloadFromDropbox, listDropboxFiles, handleDropboxCallback } from '../services/dropbox';

interface SettingsContentProps {
  onClose: () => void;
}

export default function SettingsContent({ onClose }: SettingsContentProps) {
  const scanReceiptEnabled = useSettingsStore((state) => state.scanReceiptEnabled);
  const payWithUpiEnabled = useSettingsStore((state) => state.payWithUpiEnabled);
  const darkModeEnabled = useSettingsStore((state) => state.darkModeEnabled);
  const appLockEnabled = useSettingsStore((state) => state.appLockEnabled);
  const setScanReceiptEnabled = useSettingsStore((state) => state.setScanReceiptEnabled);
  const setPayWithUpiEnabled = useSettingsStore((state) => state.setPayWithUpiEnabled);
  const setDarkModeEnabled = useSettingsStore((state) => state.setDarkModeEnabled);
  const setAppLockEnabled = useSettingsStore((state) => state.setAppLockEnabled);

  const [dropboxConnected, setDropboxConnected] = useState(false);
  const [dropboxEmail, setDropboxEmail] = useState<string | null>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.accessToken) {
      setDropboxConnected(true);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      handleDropboxCallback()
        .then((auth) => {
          if (auth) {
            setDropboxConnected(true);
            setMessage({ type: 'success', text: 'Connected to Dropbox!' });
          }
        })
        .catch((err) => {
          setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Connection failed' });
        });
    }
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">About</h3>
        <p className="text-sm text-gray-500">Expense Tracker Pro v1.0</p>
        <p className="text-sm text-gray-500">Data is stored locally on your device.</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Storage</h3>
        <p className="text-sm text-gray-500">All transactions are saved in your browser's localStorage.</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Privacy</h3>
        <p className="text-sm text-gray-500">No data is sent to any server. Everything stays on your device.</p>
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Scan Receipt</h3>
            <p className="text-xs text-gray-500">Enable receipt scanning in Add Transaction</p>
          </div>
          <button
            onClick={() => setScanReceiptEnabled(!scanReceiptEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors toggle-track ${
              scanReceiptEnabled ? 'active' : ''
            }`}
          >
            <span
              className={`toggle-thumb inline-block h-4 w-4 transform rounded-full transition-transform ${
                scanReceiptEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Pay with UPI</h3>
            <p className="text-xs text-gray-500">Enable UPI QR payment in Add Transaction</p>
          </div>
          <button
            onClick={() => setPayWithUpiEnabled(!payWithUpiEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors toggle-track ${
              payWithUpiEnabled ? 'active' : ''
            }`}
          >
            <span
              className={`toggle-thumb inline-block h-4 w-4 transform rounded-full transition-transform ${
                payWithUpiEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Dark Mode</h3>
            <p className="text-xs text-gray-500">Enable dark theme across the app</p>
          </div>
          <button
            onClick={() => setDarkModeEnabled(!darkModeEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors toggle-track ${
              darkModeEnabled ? 'active' : ''
            }`}
          >
            <span
              className={`toggle-thumb inline-block h-4 w-4 transform rounded-full transition-transform ${
                darkModeEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">App Lock</h3>
            <p className="text-xs text-gray-500">Lock app when minimized or backgrounded</p>
          </div>
          <button
            onClick={() => setAppLockEnabled(!appLockEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors toggle-track ${
              appLockEnabled ? 'active' : ''
            }`}
          >
            <span
              className={`toggle-thumb inline-block h-4 w-4 transform rounded-full transition-transform ${
                appLockEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Dropbox Backup</h3>
          <p className="text-xs text-gray-500 mb-3">Backup and restore your data to Dropbox</p>
          
          {message && (
            <div className={`mb-3 p-3 rounded-xl text-sm ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {dropboxConnected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">Connected to Dropbox</p>
                  {dropboxEmail && <p className="text-xs text-gray-500">{dropboxEmail}</p>}
                </div>
                <button
                  onClick={() => {
                    clearStoredAuth();
                    setDropboxConnected(false);
                    setDropboxEmail(null);
                    setBackups([]);
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Disconnect
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setLoading(true);
                    setMessage(null);
                    try {
                      const auth = getStoredAuth();
                      if (!auth) throw new Error('Not authenticated');
                      
                      const data = localStorage.getItem('expense-tracker-storage');
                      if (!data) throw new Error('No data to backup');
                      
                      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                      const fileName = `backup-${timestamp}.json`;
                      await uploadToDropbox(auth, fileName, data);
                      setMessage({ type: 'success', text: 'Backup created successfully!' });
                    } catch (err) {
                      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Backup failed' });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Backing up...' : 'Backup Now'}
                </button>
                <button
                  onClick={async () => {
                    setLoading(true);
                    setMessage(null);
                    try {
                      const auth = getStoredAuth();
                      if (!auth) throw new Error('Not authenticated');
                      
                      const files = await listDropboxFiles(auth);
                      const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.json'));
                      setBackups(backupFiles.sort().reverse());
                      
                      if (backupFiles.length === 0) {
                        setMessage({ type: 'success', text: 'No backups found' });
                      }
                    } catch (err) {
                      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to list backups' });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  List Backups
                </button>
              </div>

              {backups.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Available Backups:</p>
                  {backups.map((backup) => (
                    <div key={backup} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg">
                      <span className="text-sm text-gray-700 flex-1 truncate">{backup}</span>
                      <button
                        onClick={async () => {
                          setLoading(true);
                          setMessage(null);
                          try {
                            const auth = getStoredAuth();
                            if (!auth) throw new Error('Not authenticated');
                            
                            const data = await downloadFromDropbox(auth, backup);
                            localStorage.setItem('expense-tracker-storage', data);
                            setMessage({ type: 'success', text: 'Data restored successfully!' });
                          } catch (err) {
                            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Restore failed' });
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="ml-2 px-3 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={startDropboxAuth}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Connect Dropbox
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn btn-primary flex-1">
          Close
        </button>
      </div>
    </div>
  );
}
