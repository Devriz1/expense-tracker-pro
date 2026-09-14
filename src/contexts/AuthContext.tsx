import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  GoogleAuthState,
  getStoredAuth,
  signInWithGoogle,
  signOutOfGoogle,
  refreshAccessToken,
  isGoogleConfigured,
} from '../services/googleAuthService';

interface AuthContextValue {
  user: Omit<GoogleAuthState, 'accessToken' | 'tokenExpiry' | 'scope'> | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isGoogleConfigured: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDriveConnected = useSettingsStore((state) => state.setDriveConnected);

  const isConfigured = isGoogleConfigured();

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) {
      setUser({
        googleId: stored.googleId,
        email: stored.email,
        name: stored.name,
        picture: stored.picture,
      });
      setAccessToken(stored.accessToken);
      setDriveConnected(true, stored.email);
    }
  }, [setDriveConnected]);

  useEffect(() => {
    if (!isConfigured && import.meta.env.MODE !== 'test') {
      setError(
        'Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to your environment.'
      );
    }
  }, [isConfigured]);

  const signIn = useCallback(async () => {
    if (!isConfigured) {
      setError('Google Client ID not configured');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const authState = await signInWithGoogle();
      setUser({
        googleId: authState.googleId,
        email: authState.email,
        name: authState.name,
        picture: authState.picture,
      });
      setAccessToken(authState.accessToken);
      setDriveConnected(true, authState.email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      if (msg.includes('cancel') || msg.includes('popup_closed')) {
        setError('Sign-in was cancelled');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, setDriveConnected]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOutOfGoogle();
      setUser(null);
      setAccessToken(null);
      setDriveConnected(false);
    } catch (err) {
      setError('Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  }, [setDriveConnected]);

  const refresh = useCallback(async () => {
    try {
      const authState = await refreshAccessToken();
      if (authState) {
        setAccessToken(authState.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated: !!user,
    isLoading,
    error,
    isGoogleConfigured: isConfigured,
    signIn,
    signOut,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useGoogleAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within an AuthProvider');
  }
  return context;
}
