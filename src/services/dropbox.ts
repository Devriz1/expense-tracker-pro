const DROPBOX_APP_KEY = 'avj4x13tl0zxjib';
const DROPBOX_REDIRECT_URI = 'https://expense-tracker-pro-gamma-coral.vercel.app/';
const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const DROPBOX_API_URL = 'https://api.dropboxapi.com/2';

const STORAGE_KEY = 'expense-tracker-dropbox-auth';

interface DropboxAuth {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function startDropboxAuth(): Promise<void> {
  const state = generateRandomString(64);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = base64UrlEncode(await sha256(codeVerifier));

  localStorage.setItem(`${STORAGE_KEY}-state`, state);
  localStorage.setItem(`${STORAGE_KEY}-verifier`, codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: DROPBOX_APP_KEY,
    redirect_uri: DROPBOX_REDIRECT_URI,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline',
  });

  window.location.href = `${DROPBOX_AUTH_URL}?${params.toString()}`;
}

export async function handleDropboxCallback(): Promise<DropboxAuth | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');

  if (error) {
    throw new Error(`Dropbox auth error: ${error}`);
  }

  if (!code || !state) {
    return null;
  }

  const savedState = localStorage.getItem(`${STORAGE_KEY}-state`);
  const codeVerifier = localStorage.getItem(`${STORAGE_KEY}-verifier`);

  if (state !== savedState || !codeVerifier) {
    throw new Error('Invalid state parameter');
  }

  const response = await fetch(DROPBOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: DROPBOX_APP_KEY,
      redirect_uri: DROPBOX_REDIRECT_URI,
      code_verifier: codeVerifier,
      code,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = await response.json();
  
  localStorage.removeItem(`${STORAGE_KEY}-state`);
  localStorage.removeItem(`${STORAGE_KEY}-verifier`);

  const auth: DropboxAuth = {
    accessToken: data.access_token,
    expiresAt: data.expires_at ? Date.parse(data.expires_at) : undefined,
    refreshToken: data.refresh_token,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  return auth;
}

export function getStoredAuth(): DropboxAuth | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

async function dropboxRequest(auth: DropboxAuth, endpoint: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${DROPBOX_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Dropbox API error: ${response.status} - ${err}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function uploadToDropbox(auth: DropboxAuth, fileName: string, content: string): Promise<void> {
  const path = `/expense-tracker/${fileName}`;
  
  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mode: 'overwrite',
        autorename: false,
      }),
    },
    body: content,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Upload failed: ${err}`);
  }
}

export async function downloadFromDropbox(auth: DropboxAuth, fileName: string): Promise<string> {
  const path = `/expense-tracker/${fileName}`;
  
  const response = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path }),
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Download failed: ${err}`);
  }

  return response.text();
}

export async function listDropboxFiles(auth: DropboxAuth): Promise<string[]> {
  const result = await dropboxRequest(auth, '/files/list_folder', {
    method: 'POST',
    body: JSON.stringify({
      path: '/expense-tracker',
      recursive: false,
    }),
  });

  if (!result.entries) return [];
  return result.entries
    .filter((entry: any) => entry['.tag'] === 'file')
    .map((entry: any) => entry.name);
}
