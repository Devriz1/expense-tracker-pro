import { useState, useEffect } from 'react';
import { Fingerprint, Lock, Shield } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usePinFallback, setUsePinFallback] = useState(false);
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState<string | null>(null);

  useEffect(() => {
    const savedPin = localStorage.getItem('expense-tracker-pin');
    setStoredPin(savedPin);
    if (!savedPin) {
      setUsePinFallback(true);
    }
  }, []);

  const generateRandomBuffer = (length: number) => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array.buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const setupBiometric = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      const challenge = generateRandomBuffer(32);
      const userHandle = generateRandomBuffer(16);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'Expense Tracker',
            id: window.location.hostname,
          },
          user: {
            id: userHandle,
            name: 'user@expensetracker',
            displayName: 'Expense Tracker User',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'none',
        },
      } as any);

      if (credential) {
        const credId = arrayBufferToBase64((credential as PublicKeyCredential).rawId as ArrayBuffer);
        localStorage.setItem('expense-tracker-webauthn-credential-id', credId);
        localStorage.setItem('expense-tracker-webauthn-challenge', arrayBufferToBase64(challenge));
        alert('Biometric authentication setup successful!');
        onUnlock();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup biometric authentication');
    } finally {
      setIsLoading(false);
    }
  };


  const authenticateWithBiometric = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      const credId = localStorage.getItem('expense-tracker-webauthn-credential-id');
      const challengeStr = localStorage.getItem('expense-tracker-webauthn-challenge');

      if (!credId || !challengeStr) {
        throw new Error('No biometric credential found. Please set up biometric authentication first.');
      }

      const challenge = base64ToArrayBuffer(challengeStr);

      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              id: base64ToArrayBuffer(credId),
              type: 'public-key',
              transports: ['internal'],
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      } as any)) as PublicKeyCredential | null;

      if (assertion) {
        onUnlock();
      } else {
        setError('Authentication was cancelled or failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Biometric authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === storedPin) {
      onUnlock();
    } else {
      setError('Incorrect PIN');
    }
  };

  const handlePinSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    localStorage.setItem('expense-tracker-pin', pin);
    alert('PIN set successfully!');
    onUnlock();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-indigo-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">App Locked</h2>
          <p className="text-sm text-gray-500 mt-1">
            Authenticate to access your data
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {storedPin ? (
          <form onSubmit={handlePinSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="input text-center text-2xl tracking-widest"
                placeholder="••••"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full btn btn-primary"
            >
              Unlock
            </button>
          </form>
        ) : usePinFallback ? (
          <form onSubmit={handlePinSetup}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Set up PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="input text-center text-2xl tracking-widest"
                placeholder="••••"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full btn btn-primary"
            >
              Set PIN
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            {localStorage.getItem('expense-tracker-webauthn-credential-id') ? (
              <button
                onClick={authenticateWithBiometric}
                disabled={isLoading}
                className="flex flex-col items-center gap-2 p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                <Fingerprint className="w-12 h-12 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">
                  {isLoading ? 'Authenticating...' : 'Tap to unlock with biometrics'}
                </span>
              </button>
            ) : (
              <button
                onClick={setupBiometric}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Fingerprint className="w-5 h-5" />
                {isLoading ? 'Setting up...' : 'Setup Biometric Auth'}
              </button>
            )}
            <button
              onClick={() => setUsePinFallback(true)}
              className="w-full p-3 text-gray-600 hover:text-gray-800 text-sm"
            >
              Use PIN instead
            </button>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <Shield className="w-4 h-4" />
          <span>Secured with WebAuthn</span>
        </div>
      </div>
    </div>
  );
}
