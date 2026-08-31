import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SecurityState {
  isBiometricEnabled: boolean;
  credentialId: string | null;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setCredentialId: (credentialId: string | null) => void;
  resetSecurity: () => void;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set) => ({
      isBiometricEnabled: false,
      credentialId: null,
      isLocked: false,

      setIsLocked: (locked) => set({ isLocked: locked }),

      setBiometricEnabled: (enabled) => set({ isBiometricEnabled: enabled }),

      setCredentialId: (credentialId) => set({ credentialId: credentialId }),

      resetSecurity: () =>
        set({
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
