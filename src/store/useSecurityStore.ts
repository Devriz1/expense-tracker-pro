import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isBiometricAvailable } from '../utils/webauthn';

export interface SecurityState {
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;
  credentialId: string | null;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  setBiometricSupported: (supported: boolean) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setCredentialId: (credentialId: string | null) => void;
  resetSecurity: () => void;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set) => ({
      isBiometricSupported: false,
      isBiometricEnabled: false,
      credentialId: null,
      isLocked: false,

      setIsLocked: (locked) => set({ isLocked: locked }),

      setBiometricSupported: (supported) => set({ isBiometricSupported: supported }),

      setBiometricEnabled: (enabled) => set({ isBiometricEnabled: enabled }),

      setCredentialId: (credentialId) => set({ credentialId: credentialId }),

      resetSecurity: () =>
        set({
          isBiometricSupported: false,
          isBiometricEnabled: false,
          credentialId: null,
          isLocked: false,
        }),
    }),
    {
      name: 'expense-tracker-security',
      partialize: (state) => ({
        isBiometricEnabled: state.isBiometricEnabled,
        credentialId: state.credentialId,
      }),
    }
  )
);

export async function initializeSecurityState() {
  const supported = await isBiometricAvailable();
  useSecurityStore.getState().setBiometricSupported(supported);
}
