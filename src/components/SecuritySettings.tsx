import { useState, useEffect } from 'react';
import { Shield, Fingerprint } from 'lucide-react';
import { useSecurityStore } from '../store/useSecurityStore';
import { isBiometricAvailable, registerSystemBiometric } from '../utils/webauthn';

export default function SecuritySettings() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isRegisteringBiometric, setIsRegisteringBiometric] = useState(false);

  const isBiometricEnabled = useSecurityStore((state) => state.isBiometricEnabled);
  const setBiometricEnabled = useSecurityStore((state) => state.setBiometricEnabled);
  const setCredentialId = useSecurityStore((state) => state.setCredentialId);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const handleBiometricToggle = async () => {
    setError('');
    setSuccess('');

    if (isBiometricEnabled) {
      setBiometricEnabled(false);
      setCredentialId(null);
      return;
    }

    setIsRegisteringBiometric(true);
    try {
      const available = await isBiometricAvailable();
      if (!available) {
        setError('Biometric authentication is not available on this device');
        return;
      }
      const credentialId = await registerSystemBiometric('User');
      if (credentialId) {
        setCredentialId(credentialId);
        setBiometricEnabled(true);
        setSuccess('Biometric authentication enabled');
      } else {
        setError('Failed to register biometric authentication');
      }
    } finally {
      setIsRegisteringBiometric(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
          <Shield className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
          <p className="text-sm text-gray-500">Use system biometric lock to protect your data</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-sm">{success}</div>}

      <div>
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Fingerprint className="w-4 h-4" />
          Biometric Authentication
        </h4>
        {!isBiometricEnabled ? (
          <button
            onClick={handleBiometricToggle}
            disabled={isRegisteringBiometric || !biometricAvailable}
            className="btn btn-primary w-full"
          >
            {isRegisteringBiometric ? 'Setting up...' : 'Enable Biometric Lock'}
          </button>
        ) : (
          <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div>
              <p className="font-medium text-emerald-900">Biometric Enabled</p>
              <p className="text-sm text-emerald-600">Use fingerprint or face ID to unlock</p>
            </div>
            <button
              onClick={() => {
                setBiometricEnabled(false);
                setCredentialId(null);
              }}
              className="btn btn-danger"
            >
              Disable
            </button>
          </div>
        )}
        {!biometricAvailable && (
          <p className="text-sm text-gray-500 mt-2">Biometric authentication is not available on this device</p>
        )}
      </div>
    </div>
  );
}
