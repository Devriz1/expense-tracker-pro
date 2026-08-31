import { useState, useEffect } from 'react';
import { Lock, Fingerprint, AlertCircle } from 'lucide-react';
import { useSecurityStore } from '../store/useSecurityStore';
import { authenticateWithSystemBiometrics, isBiometricAvailable, checkBiometricSupport } from '../utils/webauthn';

export default function BiometricLockScreen() {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);

  const isBiometricEnabled = useSecurityStore((state) => state.isBiometricEnabled);
  const credentialId = useSecurityStore((state) => state.credentialId);
  const setIsLocked = useSecurityStore((state) => state.setIsLocked);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = checkBiometricSupport();
      const available = supported ? await isBiometricAvailable() : false;
      setBiometricAvailable(available);
    };
    checkSupport();
  }, []);

  const authenticate = async () => {
    if (!credentialId) return;
    setIsBiometricLoading(true);
    setError('');
    setHasInteracted(true);
    try {
      const success = await authenticateWithSystemBiometrics(credentialId);
      if (success) {
        setIsLocked(false);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error('Biometric authentication error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Authentication was cancelled or blocked. Tap the button below to retry.');
        } else if (err.name === 'NotSupportedError') {
          setError('Biometric authentication is not supported in this browser or context.');
        } else {
          setError('An unexpected error occurred. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsBiometricLoading(false);
    }
  };

  if (!isBiometricEnabled) return null;

  const isLikelyBlockedByBrowser = !hasInteracted && !biometricAvailable && checkBiometricSupport();

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

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <p className="text-red-600 text-sm text-left">{error}</p>
          </div>
        )}

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
          <div className="space-y-3">
            {isLikelyBlockedByBrowser ? (
              <button
                type="button"
                onClick={authenticate}
                disabled={isBiometricLoading}
                className="btn btn-primary w-full"
              >
                <Fingerprint className="w-4 h-4" />
                {isBiometricLoading ? 'Verifying...' : 'Tap to Authenticate'}
              </button>
            ) : (
              <p className="text-sm text-gray-500 text-center">
                Biometric authentication is not available on this device or browser.
              </p>
            )}
            <p className="text-xs text-gray-400 text-center">
              Make sure your device has biometrics enrolled and you are using a supported browser like Safari or Chrome.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
