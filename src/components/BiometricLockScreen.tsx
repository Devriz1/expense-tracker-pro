import { useState, useEffect } from 'react';
import { Lock, Fingerprint } from 'lucide-react';
import { useSecurityStore } from '../store/useSecurityStore';
import { authenticateWithSystemBiometrics, isBiometricAvailable } from '../utils/webauthn';

export default function BiometricLockScreen() {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [error, setError] = useState('');

  const isBiometricEnabled = useSecurityStore((state) => state.isBiometricEnabled);
  const credentialId = useSecurityStore((state) => state.credentialId);
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
      authenticate();
    }
  }, [isBiometricEnabled, biometricAvailable, credentialId]);

  const authenticate = async () => {
    if (!credentialId) return;
    setIsBiometricLoading(true);
    setError('');
    try {
      const success = await authenticateWithSystemBiometrics(credentialId);
      if (success) {
        setIsLocked(false);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Authentication was cancelled.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsBiometricLoading(false);
    }
  };

  if (!isBiometricEnabled) return null;

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="max-w-sm w-full mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">App Locked</h2>
          <p className="text-gray-500">Authenticate with your system biometrics to continue</p>
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

        {biometricAvailable ? (
          <button
            type="button"
            onClick={authenticate}
            disabled={isBiometricLoading}
            className="btn btn-success w-full"
          >
            <Fingerprint className="w-4 h-4" />
            {isBiometricLoading ? 'Verifying...' : 'Authenticate with System Biometrics'}
          </button>
        ) : (
          <p className="text-sm text-gray-500 text-center">
            Biometric authentication is not available on this device.
          </p>
        )}
      </div>
    </div>
  );
}
