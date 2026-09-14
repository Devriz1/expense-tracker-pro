const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GOOGLE_SCRIPT_ID = 'google-gsi-script';
const STORAGE_KEY = 'expense-google-auth';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export interface GoogleAuthState {
  googleId: string;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  tokenExpiry: number;
  scope: string;
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: GoogleIdConfiguration) => void;
      prompt: (callback?: (notification: PromptNotification) => void) => void;
      renderButton: (
        parent: HTMLElement,
        options: GoogleSignInButtonConfig,
        metadata?: { [key: string]: string }
      ) => void;
      cancel: () => void;
    };
    oauth2: {
      initTokenClient: (config: TokenClientConfig) => TokenClient;
    };
  };
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleIdResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: string;
}

interface GoogleIdResponse {
  credential: string;
}

interface GoogleSignInButtonConfig {
  theme?: 'outline' | 'filled_black' | 'filled_blue' | 'filled_white';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'sign_in_with';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center' | 'right';
  width?: number;
}

interface PromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedAnywhere: () => boolean;
  isGoogleInternal: () => boolean;
  openPopup: () => void;
  isDisplayed: () => boolean;
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenClientResponse) => void;
  prompt_parent_id?: string;
}

interface TokenClient {
  requestAccessToken: (options?: { hint?: string; prompt?: string }) => void;
}

interface TokenClientResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
}

let scriptLoaded = false;
let scriptLoading = false;
let tokenClient: TokenClient | null = null;

function loadGoogleScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoading) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (scriptLoaded) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(interval);
        if (!scriptLoaded) reject(new Error('Google script load timeout'));
      }, 10000);
    });
  }

  scriptLoading = true;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
    };
    script.onerror = () => {
      scriptLoading = false;
      scriptLoaded = false;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });
}

function decodeJwtPayload(token: string): Record<string, any> {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid JWT token');
  }
  const payload = parts[1];
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(padded);
  return JSON.parse(decoded);
}

export function isGoogleConfigured(): boolean {
  return !!GOOGLE_CLIENT_ID;
}

export function getStoredAuth(): GoogleAuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state: GoogleAuthState = JSON.parse(raw);
    if (state.tokenExpiry && Date.now() < state.tokenExpiry - TOKEN_EXPIRY_BUFFER_MS) {
      return state;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveAuth(auth: GoogleAuthState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function signInWithGoogle(): Promise<GoogleAuthState> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID is not configured');
  }

  await loadGoogleScript();

  if (!window.google) {
    throw new Error('Google Identity Services not loaded');
  }

  return new Promise<GoogleAuthState>((resolve, reject) => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        reject(new Error('Sign-in timed out. Please try again.'));
      }
    }, 60000);

    window.google!.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: GoogleIdResponse) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        try {
          const payload = decodeJwtPayload(response.credential);
          const authState = await requestDriveToken(payload);
          resolve(authState);
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Failed to complete Google sign-in'));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: false,
      context: 'signin',
    });

    window.google!.accounts.id.prompt((notification: PromptNotification) => {
      if (cancelled) return;
      if (notification.isSkippedAnywhere()) {
        clearTimeout(timeoutId);
        cancelled = true;
        reject(new Error('Sign-in was cancelled'));
      } else if (!notification.isNotDisplayed()) {
        notification.openPopup();
      }
    });
  });
}

async function requestDriveToken(idTokenPayload: Record<string, any>): Promise<GoogleAuthState> {
  const authState = await new Promise<GoogleAuthState>((resolve, reject) => {
    if (!window.google) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }

    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        reject(new Error('Drive permission request timed out. Please try again.'));
      }
    }, 60000);

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response: TokenClientResponse) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        resolve({
          googleId: idTokenPayload.sub,
          email: idTokenPayload.email,
          name: idTokenPayload.name || idTokenPayload.email,
          picture: idTokenPayload.picture || '',
          accessToken: response.access_token,
          tokenExpiry: Date.now() + response.expires_in * 1000,
          scope: response.scope,
        });
      },
    });

    tokenClient.requestAccessToken();
  });

  return authState;
}

export async function refreshAccessToken(): Promise<GoogleAuthState | null> {
  const stored = getStoredAuth();
  if (!stored) return null;

  if (stored.tokenExpiry && Date.now() < stored.tokenExpiry - TOKEN_EXPIRY_BUFFER_MS) {
    return stored;
  }

  await loadGoogleScript();

  if (!window.google) {
    throw new Error('Google Identity Services not loaded');
  }

  return new Promise<GoogleAuthState>((resolve, reject) => {
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response: TokenClientResponse) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        const refreshed: GoogleAuthState = {
          ...stored,
          accessToken: response.access_token,
          tokenExpiry: Date.now() + response.expires_in * 1000,
          scope: response.scope,
        };
        saveAuth(refreshed);
        resolve(refreshed);
      },
    });

    tokenClient.requestAccessToken();
  });
}

export async function signOutOfGoogle(): Promise<void> {
  clearAuth();
  tokenClient = null;
  if (window.google) {
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: () => {},
      });
    } catch {
    }
  }
}

export async function getActiveAccessToken(): Promise<string> {
  const auth = getStoredAuth();
  if (!auth) {
    throw new Error('Not authenticated. Please sign in with Google.');
  }

  if (auth.tokenExpiry && Date.now() >= auth.tokenExpiry - TOKEN_EXPIRY_BUFFER_MS) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw new Error('Session expired. Please sign in again.');
    }
    return refreshed.accessToken;
  }

  return auth.accessToken;
}

export async function renderGoogleButton(
  element: HTMLElement,
  options?: Partial<GoogleSignInButtonConfig>
): Promise<void> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID is not configured');
  }
  await loadGoogleScript();
  if (!window.google) {
    throw new Error('Google Identity Services not loaded');
  }

  const defaultOptions: GoogleSignInButtonConfig = {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    width: element.offsetWidth || 240,
    logo_alignment: 'left',
    ...options,
  };

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: () => {},
    auto_select: false,
    cancel_on_tap_outside: false,
  });

  window.google.accounts.id.renderButton(element, defaultOptions);
}
