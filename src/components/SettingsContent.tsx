import { useState, useEffect } from 'react';
import { useSecurityStore } from '../store/useSecurityStore';
import { hashPin } from '../utils/webauthn';

interface SettingsContentProps {
  onClose: () => void;
}

export default function SettingsContent({ onClose }: SettingsContentProps) {
  const isPinEnabled = useSecurityStore((state) => state.isPinEnabled);
  const setPinEnabled = useSecurityStore((state) => state.setPinEnabled);
  const setPinHash = useSecurityStore((state) => state.setPinHash);
  const resetSecurity = useSecurityStore((state) => state.resetSecurity);

  const [tempPin, setTempPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'set' | 'change' | 'remove'>('set');

  const handleSetPin = async () => {
    if (mode === 'change' && currentPin.length < 4) {
      setError('Please enter current PIN');
      return;
    }
    if (tempPin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    if (tempPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    if (mode === 'change') {
      const currentHash = await hashPin(currentPin);
      if (currentHash !== useSecurityStore.getState().pinHash) {
        setError('Current PIN is incorrect');
        return;
      }
    }
    const hash = await hashPin(tempPin);
    setPinHash(hash);
    setPinEnabled(true);
    setTempPin('');
    setConfirmPin('');
    setCurrentPin('');
    setError('');
    onClose();
  };

  const handleRemovePin = () => {
    resetSecurity();
    setTempPin('');
    setConfirmPin('');
    setCurrentPin('');
    setError('');
    setMode('set');
  };

  useEffect(() => {
    if (isPinEnabled) {
      setMode('change');
    } else {
      setMode('set');
    }
  }, [isPinEnabled]);

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
            <h3 className="text-sm font-medium text-gray-700">PIN Lock</h3>
            <p className="text-xs text-gray-500">
              {isPinEnabled ? 'PIN lock is enabled' : 'Protect your data with a PIN'}
            </p>
          </div>
          <button
            onClick={() => setPinEnabled(!isPinEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isPinEnabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPinEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {isPinEnabled && mode === 'change' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Current PIN</label>
              <input
                type="password"
                value={currentPin}
                onChange={(e) => {
                  setCurrentPin(e.target.value);
                  setError('');
                }}
                placeholder="Enter current PIN"
                className="input"
                maxLength={6}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">New PIN</label>
              <input
                type="password"
                value={tempPin}
                onChange={(e) => {
                  setTempPin(e.target.value);
                  setError('');
                }}
                placeholder="Enter new PIN"
                className="input"
                maxLength={6}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Confirm New PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value);
                  setError('');
                }}
                placeholder="Re-enter new PIN"
                className="input"
                maxLength={6}
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleRemovePin} className="btn btn-danger flex-1">
                Remove PIN
              </button>
              <button onClick={handleSetPin} className="btn btn-primary flex-1">
                Update PIN
              </button>
            </div>
          </div>
        )}

        {!isPinEnabled && mode === 'set' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Set PIN</label>
              <input
                type="password"
                value={tempPin}
                onChange={(e) => {
                  setTempPin(e.target.value);
                  setError('');
                }}
                placeholder="Enter 4+ digit PIN"
                className="input"
                maxLength={6}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value);
                  setError('');
                }}
                placeholder="Re-enter PIN"
                className="input"
                maxLength={6}
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button onClick={handleSetPin} className="btn btn-primary w-full">
              Save PIN
            </button>
          </div>
        )}

        {isPinEnabled && (
          <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg mt-3">
            PIN lock is active. You will be asked for PIN on app launch.
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn btn-primary flex-1">
          Close
        </button>
      </div>
    </div>
  );
}
