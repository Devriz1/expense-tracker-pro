import { useSettingsStore } from '../store/useSettingsStore';
import { BackupFormat, BackupFrequency, isWebPlatform } from '../services/backupService';
import { Cloud } from 'lucide-react';

interface SettingsContentProps {
  onClose: () => void;
}

export default function SettingsContent({ onClose }: SettingsContentProps) {
  const scanReceiptEnabled = useSettingsStore((state) => state.scanReceiptEnabled);
  const payWithUpiEnabled = useSettingsStore((state) => state.payWithUpiEnabled);
  const darkModeEnabled = useSettingsStore((state) => state.darkModeEnabled);
  const appLockEnabled = useSettingsStore((state) => state.appLockEnabled);
  const backup = useSettingsStore((state) => state.backup);

  const setScanReceiptEnabled = useSettingsStore((state) => state.setScanReceiptEnabled);
  const setPayWithUpiEnabled = useSettingsStore((state) => state.setPayWithUpiEnabled);
  const setDarkModeEnabled = useSettingsStore((state) => state.setDarkModeEnabled);
  const setAppLockEnabled = useSettingsStore((state) => state.setAppLockEnabled);
  const setBackupFolder = useSettingsStore((state) => state.setBackupFolder);
  const setBackupFormat = useSettingsStore((state) => state.setBackupFormat);
  const setAutoBackupEnabled = useSettingsStore((state) => state.setAutoBackupEnabled);
  const setBackupFrequency = useSettingsStore((state) => state.setBackupFrequency);
  const setLastBackupAt = useSettingsStore((state) => state.setLastBackupAt);
  const backupNow = useSettingsStore((state) => state.backupNow);
  const pickBackupFolderAction = useSettingsStore((state) => state.pickBackupFolder);

  const isWeb = isWebPlatform();

  const handlePickFolder = async () => {
    if (!isWeb) return;
    const result = await pickBackupFolderAction();
    if (result) {
      setBackupFolder(result.folderUri, result.folderName);
    }
  };

  const handleBackupNow = async () => {
    try {
      await backupNow();
      setLastBackupAt(new Date().toISOString());
    } catch (err) {
      console.error('Backup failed', err);
    }
  };

  const formatLastBackup = (iso?: string) => {
    if (!iso) return 'Never';
    const date = new Date(iso);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-4">
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
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 toggle-track ${
              scanReceiptEnabled ? 'active' : ''
            }`}
          >
            <span
              className={`toggle-thumb inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ease-in-out will-change-transform ${
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
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 toggle-track ${
              payWithUpiEnabled ? 'active' : ''
            }`}
          >
            <span
              className={`toggle-thumb inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ease-in-out will-change-transform ${
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
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 toggle-track ${
              darkModeEnabled ? 'active' : ''
            }`}
          >
            <span
              className={`toggle-thumb inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ease-in-out will-change-transform ${
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
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 toggle-track ${
              appLockEnabled ? 'active' : ''
            }`}
          >
            <span
              className={`toggle-thumb inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ease-in-out will-change-transform ${
                appLockEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="border-t border-amber-200 pt-4 space-y-3 bg-amber-50 -mx-4 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-900">Google Sync Active</h3>
            <p className="text-xs text-amber-700 mt-0.5">
              We recommend using <strong>Manual Backup</strong> to prevent data loss. Auto-backup may conflict with Google sync.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Backup</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">Auto backup</p>
            <p className="text-xs text-gray-500">Backup automatically after changes</p>
          </div>
          <button
            onClick={() => setAutoBackupEnabled(!backup.autoBackupEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 toggle-track ${
              backup.autoBackupEnabled ? 'active' : ''
            }`}
          >
            <span
              className={`toggle-thumb inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ease-in-out will-change-transform ${
                backup.autoBackupEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {backup.autoBackupEnabled && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Frequency</p>
            <select
              value={backup.backupFrequency}
              onChange={(e) => setBackupFrequency(e.target.value as BackupFrequency)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="hourly7">Every 7 Hours</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-500 mb-1">Format: {backup.format.toUpperCase()}</p>
          <select
            value={backup.format}
            onChange={(e) => setBackupFormat(e.target.value as BackupFormat)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="json">JSON only</option>
            <option value="csv">CSV only</option>
            <option value="both">JSON + CSV</option>
          </select>
        </div>

<div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Folder</p>
              <p className="text-xs text-gray-500">
                {backup.folderName || (isWeb ? 'Not selected' : 'Tap Backup Now to share')}
              </p>
            </div>
            {isWeb ? (
              <button onClick={handlePickFolder} className="btn btn-secondary">
                Choose
              </button>
            ) : null}
          </div>

        <button onClick={handleBackupNow} className="btn btn-primary w-full">
          Backup Now
        </button>

        <p className="text-xs text-gray-500">
          Last backup: {formatLastBackup(backup.lastBackupAt)}
        </p>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn btn-primary flex-1">
          Close
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">
          {isWeb
            ? 'Web: backups are written to the chosen folder, or downloaded if no folder is selected.'
            : 'Mobile: backups are saved to Documents/ExpenseTrackerBackups and can be accessed with any file manager.'}
        </p>
      </div>
    </div>
  );
}
