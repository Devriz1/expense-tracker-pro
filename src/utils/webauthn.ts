export function checkBiometricSupport(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  return true;
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!checkBiometricSupport()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerSystemBiometric(userDisplayName: string): Promise<string | null> {
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
        rp: { name: 'Expense Tracker' },
        user: {
          id: new Uint8Array(16),
          name: 'user@example.com',
          displayName: userDisplayName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        excludeCredentials: [],
      },
    });

    if (credential) {
      const rawId = (credential as any).rawId || (credential as any).response?.rawId;
      if (!rawId) return null;
      const id = Array.from(new Uint8Array(rawId)).map((b) => b.toString(16).padStart(2, '0')).join('');
      return id;
    }
    return null;
  } catch (error) {
    console.error('Biometric registration failed:', error);
    return null;
  }
}

export async function authenticateWithSystemBiometrics(credentialId: string): Promise<boolean> {
  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
        allowCredentials: [
          {
            id: new Uint8Array(credentialId.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))),
            type: 'public-key',
          },
        ],
        userVerification: 'required',
      },
    });

    return !!credential;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    return false;
  }
}
