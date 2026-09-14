// Dropbox backup integration using the official Dropbox JS SDK
// Replaces Google Drive integration with Dropbox storage

import { Dropbox } from 'dropbox';

// --- Configuration ---
// Replace this with your Dropbox App Key from the Dropbox Developer Console
const CLIENT_ID = 'cti3t7idzl6t9fa';

// --- PKCE Code Verifier ---
const PKCE_CODE_VERIFIER_KEY = 'dropbox_pkce_code_verifier';

/**
 * Generate a random PKCE code_verifier (43-128 chars from unreserved set)
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  // Convert to base64url (unreserved chars: A-Z a-z 0-9 - _ . ~)
  let result = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return result;
}

/**
 * Generate SHA-256 code_challenge from code_verifier (base64url encoded)
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  // base64url encode the SHA-256 hash
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// --- Token Management ---
const DROPBOX_TOKEN_KEY = 'dropbox_token';
const DROPBOX_TOKEN_EXPIRY_KEY = 'dropbox_token_expiry';

export interface DropboxAuthState {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Check if URL hash or query contains an OAuth callback.
 * Handles both PKCE code flow (response_type=code) and legacy token flow.
 * If found, persist it and clean the URL.
 */
export async function handleDropboxOAuthCallback(): Promise<DropboxAuthState | null> {
  // Check both hash and query string for OAuth callback
  const hash = window.location.hash.substring(1);
  const queryString = window.location.search.substring(1);
  const params = new URLSearchParams(hash || queryString);
  
  console.log('[Dropbox OAuth] Checking for callback. Hash:', hash ? 'present' : 'empty', 'QueryString:', queryString ? 'present' : 'empty');
  
  if (!hash && !queryString) {
    console.log('[Dropbox OAuth] No OAuth callback parameters found');
    return null;
  }

  const code = params.get('code');
  const accessToken = params.get('access_token');
  const error = params.get('error');
  
  console.log('[Dropbox OAuth] Params - code:', code ? 'present' : 'not found', 'access_token:', accessToken ? 'present' : 'not found', 'error:', error || 'none');

  // Handle OAuth error from Dropbox
  if (error) {
    console.error('[Dropbox OAuth] OAuth error from Dropbox:', error, params.get('error_description'));
    window.history.replaceState({}, document.title, window.location.pathname);
    return null;
  }

  // PKCE flow: exchange authorization code for access token
  if (code) {
    console.log('[Dropbox OAuth] Found authorization code in URL, exchanging for token...');
    console.log('[Dropbox OAuth] Code (first 10 chars):', code.substring(0, 10) + '...');

    // IMMEDIATELY clean the URL to prevent duplicate processing on page refresh
    console.log('[Dropbox OAuth] Cleaning URL immediately to prevent duplicate code usage');
    window.history.replaceState({}, document.title, window.location.pathname);

    // Get the stored code_verifier for PKCE
    const codeVerifier = localStorage.getItem(PKCE_CODE_VERIFIER_KEY);
    console.log('[Dropbox OAuth] Code verifier present:', !!codeVerifier);
    if (codeVerifier) {
      console.log('[Dropbox OAuth] Code verifier (first 10 chars):', codeVerifier.substring(0, 10) + '...');
    }
    
    // Ensure exact redirect_uri match (with trailing slash)
    const exactRedirectUri = window.location.origin.endsWith('/')
      ? window.location.origin
      : `${window.location.origin}/`;
    console.log('[Dropbox OAuth] Redirect URI:', exactRedirectUri);
    console.log('[Dropbox OAuth] Client ID:', CLIENT_ID);

    try {
      const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: CLIENT_ID,
          redirect_uri: exactRedirectUri,
          code_verifier: codeVerifier || '',
        }),
      });

      console.log('[Dropbox OAuth] Token exchange response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text().catch(() => '');
        console.error('[Dropbox OAuth] Token exchange failed:', tokenResponse.status, errorText);
        return null;
      }

      const data = await tokenResponse.json();
      console.log('[Dropbox OAuth] Token exchange successful, got access_token');
      console.log('[Dropbox OAuth] Token expires_in:', data.expires_in);

      // Clean up the stored code_verifier
      localStorage.removeItem(PKCE_CODE_VERIFIER_KEY);

      const authState: DropboxAuthState = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || undefined,
        expiresAt: data.expires_in
          ? Date.now() + data.expires_in * 1000
          : undefined,
      };

      localStorage.setItem(DROPBOX_TOKEN_KEY, JSON.stringify(authState));
      if (authState.expiresAt) {
        localStorage.setItem(DROPBOX_TOKEN_EXPIRY_KEY, String(authState.expiresAt));
      }

      console.log('[Dropbox OAuth] Auth state saved to localStorage');
      return authState;
    } catch (err) {
      console.error('[Dropbox OAuth] Token exchange error:', err);
      return null;
    }
  }

  // Legacy token flow (response_type=token)
  if (!accessToken) return null;

  const refreshToken = params.get('refresh_token');
  const expiresIn = params.get('expires_in');

  const expiresAt = expiresIn
    ? Date.now() + parseInt(expiresIn, 10) * 1000
    : undefined;

  const authState: DropboxAuthState = {
    accessToken,
    refreshToken: refreshToken || undefined,
    expiresAt,
  };

  localStorage.setItem(DROPBOX_TOKEN_KEY, JSON.stringify(authState));
  if (expiresAt) {
    localStorage.setItem(DROPBOX_TOKEN_EXPIRY_KEY, String(expiresAt));
  }

  // Clean the URL hash
  window.history.replaceState({}, document.title, window.location.pathname);

  console.log('[Dropbox OAuth] Auth state saved (legacy flow)');
  return authState;
}

/**
 * Get stored Dropbox auth state from localStorage.
 */
export function getStoredDropboxAuth(): DropboxAuthState | null {
  try {
    const raw = localStorage.getItem(DROPBOX_TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DropboxAuthState;
  } catch {
    return null;
  }
}

/**
 * Clear stored Dropbox auth state (disconnect).
 */
export function clearDropboxAuth(): void {
  localStorage.removeItem(DROPBOX_TOKEN_KEY);
  localStorage.removeItem(DROPBOX_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(PKCE_CODE_VERIFIER_KEY);
}

/**
 * Check if the stored token is expired.
 */
export function isDropboxTokenExpired(): boolean {
  const raw = localStorage.getItem(DROPBOX_TOKEN_EXPIRY_KEY);
  if (!raw) return false;
  return Date.now() >= parseInt(raw, 10);
}

/**
 * Start the Dropbox OAuth PKCE flow.
 * Uses response_type=code with token_access_type=offline for refresh tokens.
 * Redirects the user to Dropbox to authorize the app.
 */
export async function startDropboxAuth(): Promise<void> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store code_verifier for later use during token exchange
  localStorage.setItem(PKCE_CODE_VERIFIER_KEY, codeVerifier);

  // Ensure exact redirect_uri match (with trailing slash)
  const exactRedirectUri = window.location.origin.endsWith('/')
    ? window.location.origin
    : `${window.location.origin}/`;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: exactRedirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline',
    scope: 'account_info.read files.content.write files.metadata.write',
  });

  console.log('[Dropbox OAuth] Starting PKCE flow, redirecting to Dropbox...');
  console.log('[Dropbox OAuth] Redirect URI:', exactRedirectUri);
  window.location.href = `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Refresh the Dropbox access token using the refresh token.
 */
export async function refreshDropboxToken(): Promise<DropboxAuthState> {
  const stored = getStoredDropboxAuth();
  if (!stored?.refreshToken) {
    throw new Error('No refresh token available. Please sign in again.');
  }

  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: stored.refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!response.ok) {
    clearDropboxAuth();
    throw new Error('Token refresh failed. Please sign in again.');
  }

  const data = await response.json();
  const authState: DropboxAuthState = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || stored.refreshToken,
    expiresAt: data.expires_in
      ? Date.now() + data.expires_in * 1000
      : undefined,
  };

  localStorage.setItem(DROPBOX_TOKEN_KEY, JSON.stringify(authState));
  if (authState.expiresAt) {
    localStorage.setItem(DROPBOX_TOKEN_EXPIRY_KEY, String(authState.expiresAt));
  }

  return authState;
}

/**
 * Get a valid Dropbox client instance.
 * Refreshes the token if expired.
 */
export async function getDropboxClient(): Promise<Dropbox> {
  let auth = getStoredDropboxAuth();

  if (!auth) {
    throw new Error('Not authenticated with Dropbox. Please sign in.');
  }

  if (isDropboxTokenExpired()) {
    auth = await refreshDropboxToken();
  }

  return new Dropbox({ accessToken: auth.accessToken });
}

/**
 * Upload a backup file to Dropbox.
 * Uses mode: 'overwrite' to replace existing files seamlessly.
 */
export async function uploadDropboxBackup(
  content: string,
  path: string = '/backup.json'
): Promise<{ success: boolean; fileName?: string; error?: string }> {
  try {
    const dbx = await getDropboxClient();

    // Sanitize path - ensure it starts with /
    const safePath = path.startsWith('/') ? path : '/' + path;

    const result = await dbx.filesUpload({
      path: safePath,
      contents: content,
      mode: { '.tag': 'overwrite' },
      autorename: false,
    });

    const fileMeta = (result as any).result || result;
    return { success: true, fileName: fileMeta.name || safePath.split('/').pop() };
  } catch (err: any) {
    // Handle 401 Unauthorized - token expired/invalid
    if (err.status === 401 || err.response?.status === 401) {
      clearDropboxAuth();
      return { success: false, error: 'Token expired. Please sign in again.' };
    }

    const errorMsg = err.message || err.response?.data?.error || 'Upload failed';
    return { success: false, error: errorMsg };
  }
}

/**
 * List backup files in Dropbox.
 */
export async function listDropboxBackups(
  folder: string = '/'
): Promise<{ name: string; path: string; size: number; modified: string }[]> {
  try {
    const dbx = await getDropboxClient();
    const safePath = folder === '/' ? '' : folder;

    const result = await dbx.filesListFolder({
      path: safePath,
      recursive: false,
    });

    const listResult = (result as any).result || result;
    return listResult.entries
      .filter((entry: any) => entry.name.endsWith('.json'))
      .map((entry: any) => ({
        name: entry.name,
        path: entry.path_lower || '',
        size: entry.size || 0,
        modified: entry.server_modified || '',
      }));
  } catch (err: any) {
    if (err.status === 401 || err.response?.status === 401) {
      clearDropboxAuth();
      throw new Error('Token expired. Please sign in again.');
    }
    throw err;
  }
}

/**
 * Download a backup file from Dropbox.
 */
export async function downloadDropboxBackup(
  path: string
): Promise<string> {
  try {
    const dbx = await getDropboxClient();
    const safePath = path.startsWith('/') ? path : '/' + path;

    const result = await dbx.filesDownload({ path: safePath });
    const downloadResult = (result as any).result || result;
    const blob = downloadResult.fileBlob;
    return await blob.text();
  } catch (err: any) {
    if (err.status === 401 || err.response?.status === 401) {
      clearDropboxAuth();
      throw new Error('Token expired. Please sign in again.');
    }
    throw err;
  }
}

/**
 * Delete a backup file from Dropbox.
 */
export async function deleteDropboxBackup(path: string): Promise<boolean> {
  try {
    const dbx = await getDropboxClient();
    const safePath = path.startsWith('/') ? path : '/' + path;
    await dbx.filesDeleteV2({ path: safePath });
    return true;
  } catch (err: any) {
    if (err.status === 401 || err.response?.status === 401) {
      clearDropboxAuth();
      throw new Error('Token expired. Please sign in again.');
    }
    return false;
  }
}

/**
 * Get the current Dropbox user's profile information.
 * Uses direct API call to /2/users/get_current_account.
 * Saves user info to localStorage for persistence.
 */
export async function getDropboxUserProfile(): Promise<{
  name: string;
  email: string;
  accountId: string;
  profilePic?: string;
} | null> {
  try {
    const auth = getStoredDropboxAuth();
    if (!auth) {
      console.log('No Dropbox auth found, cannot fetch profile');
      return null;
    }

    console.log('Fetching Dropbox profile with token:', auth.accessToken.substring(0, 10) + '...');

    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Dropbox profile response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Dropbox profile fetch failed:', response.status, errorText);
      
      if (response.status === 401) {
        console.log('Token expired, clearing auth');
        clearDropboxAuth();
        return null;
      }
      if (response.status === 403) {
        console.log('Permission denied - account.info.read scope may be missing');
        return null;
      }
      return null;
    }

    const data = await response.json();
    console.log('Dropbox user profile data:', data);

    const userInfo = {
      email: data.email || '',
      name: data.name?.display_name || data.display_name?.display_name || 'Dropbox User',
      accountId: data.account_id || '',
      profilePic: data.profile_photo_url || undefined,
    };

    // Persist user info to localStorage
    localStorage.setItem('dropbox_user_info', JSON.stringify(userInfo));
    console.log('Saved Dropbox user info to localStorage:', userInfo);

    return userInfo;
  } catch (err: any) {
    console.error('Failed to fetch Dropbox profile:', err);
    return null;
  }
}

/**
 * Load persisted user info from localStorage (for initial page load).
 */
export function getStoredDropboxUserInfo(): {
  name: string;
  email: string;
  accountId: string;
  profilePic?: string;
} | null {
  try {
    const raw = localStorage.getItem('dropbox_user_info');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clear stored user info (called on disconnect).
 */
export function clearDropboxUserInfo(): void {
  localStorage.removeItem('dropbox_user_info');
}