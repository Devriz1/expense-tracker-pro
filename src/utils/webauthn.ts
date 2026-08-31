const CHALLENGE = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometric(): Promise<string | null> {
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: CHALLENGE,
        rp: { name: 'Expense Tracker' },
        user: {
          id: new Uint8Array(16),
          name: 'user@example.com',
          displayName: 'User',
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

export async function authenticateWithBiometric(credentialId: string): Promise<boolean> {
  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: CHALLENGE,
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

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'expense-tracker-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
