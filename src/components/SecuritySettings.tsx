import { useState, useEffect } from 'react';
import { Shield, Lock, Fingerprint, Eye, EyeOff } from 'lucide-react';
import { useSecurityStore } from '../store/useSecurityStore';
import { isBiometricAvailable, registerBiometric, hashPin } from '../utils/webauthn';

export default function SecuritySettings() {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isRegisteringBiometric, setIsRegisteringBiometric] = useState(false);

  const isPinEnabled = useSecurityStore((state) => state.isPinEnabled);
  const isBiometricEnabled = useSecurityStore((state) => state.isBiometricEnabled);
  const setPinEnabled = useSecurityStore((state) => state.setPinEnabled);
  const setPinHash = useSecurityStore((state) => state.setPinHash);
  const setBiometricEnabled = useSecurityStore((state) => state.setBiometricEnabled);
  const setCredentialId = useSecurityStore((state) => state.setCredentialId);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN must be 4-6 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    const hashedPin = await hashPin(pin);
    setPinHash(hashedPin);
    setPinEnabled(true);
    setSuccess('PIN enabled successfully');
    setPin('');
    setConfirmPin('');
  };

  const handleBiometricToggle = async () => {
    setError('');
    setSuccess('');

    if (isBiometricEnabled) {
      setBiometricEnabled(false);
      setCredentialId(null);
      return;
    }

    if (!isPinEnabled) {
      setError('Please enable PIN first before using biometrics');
      return;
    }

    setIsRegisteringBiometric(true);
    try {
      const available = await isBiometricAvailable();
      if (!available) {
        setError('Biometric authentication is not available on this device');
        return;
      }
      const credentialId = await registerBiometric();
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
          <p className="text-sm text-gray-500">Protect your data with PIN and biometrics</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-sm">{success}</div>}

      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            PIN Protection
          </h4>
          {!isPinEnabled ? (
            <form onSubmit={handlePinSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-6 digit PIN"
                  className="input pr-10"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm PIN"
                className="input"
                maxLength={6}
              />
              <button type="submit" className="btn btn-primary w-full">
                Enable PIN Protection
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div>
                <p className="font-medium text-emerald-900">PIN Protection Enabled</p>
                <p className="text-sm text-emerald-600">Your app is protected with a PIN</p>
              </div>
              <button
                onClick={() => setPinEnabled(false)}
                className="btn btn-danger"
              >
                Disable
              </button>
            </div>
          )}
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Fingerprint className="w-4 h-4" />
            Biometric Authentication
          </h4>
          {!isBiometricEnabled ? (
            <button
              onClick={handleBiometricToggle}
              disabled={!isPinEnabled || isRegisteringBiometric || !biometricAvailable}
              className="btn btn-primary w-full"
            >
              {isRegisteringBiometric ? 'Setting up...' : 'Enable Biometric Login'}
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
    </div>
  );
}
