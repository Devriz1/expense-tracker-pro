import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { hashPin } from '../utils/webauthn';

export interface SecurityState {
  isPinEnabled: boolean;
  pinHash: string;
  isBiometricEnabled: boolean;
  credentialId: string | null;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  setPinEnabled: (enabled: boolean) => void;
  setPinHash: (hash: string) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setCredentialId: (credentialId: string | null) => void;
  verifyPin: (pin: string) => Promise<boolean>;
  resetSecurity: () => void;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      isPinEnabled: false,
      pinHash: '',
      isBiometricEnabled: false,
      credentialId: null,
      isLocked: false,

      setIsLocked: (locked) => set({ isLocked: locked }),

      setPinEnabled: (enabled) => set({ isPinEnabled: enabled }),

      setPinHash: (hash) => set({ pinHash: hash }),

      setBiometricEnabled: (enabled) => set({ isBiometricEnabled: enabled }),

      setCredentialId: (credentialId) => set({ credentialId: credentialId }),

      verifyPin: async (pin: string) => {
        const hash = await hashPin(pin);
        return hash === get().pinHash;
      },

      resetSecurity: () =>
        set({
          isPinEnabled: false,
          pinHash: '',
          isBiometricEnabled: false,
          credentialId: null,
          isLocked: false,
        }),
    }),
    {
      name: 'expense-tracker-security',
      partialize: (state) => ({
        isPinEnabled: state.isPinEnabled,
        pinHash: state.pinHash,
        isBiometricEnabled: state.isBiometricEnabled,
        credentialId: state.credentialId,
      }),
    }
  )
);
