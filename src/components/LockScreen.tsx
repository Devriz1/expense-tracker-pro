import { useState, useEffect } from 'react';
import { Lock, Unlock, Fingerprint } from 'lucide-react';
import { useSecurityStore } from '../store/useSecurityStore';
import { authenticateWithBiometric, isBiometricAvailable } from '../utils/webauthn';

export default function LockScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  const isPinEnabled = useSecurityStore((state) => state.isPinEnabled);
  const isBiometricEnabled = useSecurityStore((state) => state.isBiometricEnabled);
  const credentialId = useSecurityStore((state) => state.credentialId);
  const verifyPin = useSecurityStore((state) => state.verifyPin);
  const setIsLocked = useSecurityStore((state) => state.setIsLocked);

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, []);

  useEffect(() => {
    if (isBiometricEnabled && biometricAvailable && credentialId) {
      handleBiometricAuth();
    }
  }, []);

  const handleBiometricAuth = async () => {
    if (!credentialId) return;
    setIsBiometricLoading(true);
    try {
      const success = await authenticateWithBiometric(credentialId);
      if (success) {
        setIsLocked(false);
      }
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPinEnabled) return;
    const valid = await verifyPin(pin);
    if (valid) {
      setIsLocked(false);
      setPin('');
      setError('');
    } else {
      setError('Incorrect PIN');
    }
  };

  if (!isPinEnabled && !isBiometricEnabled) return null;

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="max-w-sm w-full mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">App Locked</h2>
          <p className="text-gray-500">Enter your PIN or use biometrics to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isPinEnabled && (
            <div>
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder="Enter PIN"
                className="input text-center text-2xl tracking-widest"
                maxLength={6}
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            </div>
          )}

          <div className="flex gap-2">
            {isPinEnabled && (
              <button type="submit" className="btn btn-primary flex-1">
                <Unlock className="w-4 h-4" />
                Unlock
              </button>
            )}

            {isBiometricEnabled && biometricAvailable && (
              <button
                type="button"
                onClick={handleBiometricAuth}
                disabled={isBiometricLoading}
                className={`btn ${isBiometricEnabled && biometricAvailable ? 'btn-success' : 'btn-ghost'} ${!isPinEnabled ? 'w-full' : ''}`}
              >
                <Fingerprint className="w-4 h-4" />
                {isBiometricLoading ? 'Verifying...' : 'Biometric'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
