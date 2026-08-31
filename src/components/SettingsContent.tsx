import { useSecurityStore } from '../store/useSecurityStore';

interface SettingsContentProps {
  onClose: () => void;
}

export default function SettingsContent({ onClose }: SettingsContentProps) {
  const isBiometricEnabled = useSecurityStore((state) => state.isBiometricEnabled);
  const setBiometricEnabled = useSecurityStore((state) => state.setBiometricEnabled);

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

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Biometric Lock</h3>
            <p className="text-xs text-gray-500">
              {isBiometricEnabled ? 'Biometric lock is enabled' : 'Protect your data with biometrics'}
            </p>
          </div>
          <button
            onClick={() => setBiometricEnabled(!isBiometricEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isBiometricEnabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isBiometricEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
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
