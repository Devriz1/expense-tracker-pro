import crypto from 'crypto';

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI || 'https://expense-tracker-pro-gamma-coral.vercel.app/api/dropbox/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://expense-tracker-pro-gamma-coral.vercel.app';

const TOKEN_DIR = '/tmp/dropbox-tokens';
const STATE_DIR = '/tmp/dropbox-states';

function ensureDir(dir: string): void {
  try { require('fs').mkdirSync(dir, { recursive: true }); } catch {}
}

function getTokenPath(userId: string): string {
  ensureDir(TOKEN_DIR);
  return `${TOKEN_DIR}/${userId}.json`;
}

function getStatePath(state: string): string {
  ensureDir(STATE_DIR);
  return `${STATE_DIR}/${state}.json`;
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const tokenPath = getTokenPath(userId);
  let tokenData: any = {};

  try {
    tokenData = JSON.parse(require('fs').readFileSync(tokenPath, 'utf-8'));
  } catch {
    throw new Error('Not connected');
  }

  if (Date.now() < (tokenData.expires_at || 0) - 60000) {
    return tokenData.access_token;
  }

  if (!tokenData.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenData.refresh_token,
      client_id: DROPBOX_APP_KEY,
      client_secret: DROPBOX_APP_SECRET,
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error_description || data.error);

  tokenData.access_token = data.access_token;
  tokenData.expires_at = Date.now() + (data.expires_in || 14400) * 1000;
  require('fs').writeFileSync(tokenPath, JSON.stringify(tokenData));

  return data.access_token;
}

export async function storeToken(userId: string, tokenData: { access_token: string; refresh_token?: string; expires_in?: number }): Promise<void> {
  const tokenPath = getTokenPath(userId);
  const data = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + (tokenData.expires_in || 14400) * 1000,
  };
  require('fs').writeFileSync(tokenPath, JSON.stringify(data));
}

export async function getStoredState(state: string): Promise<any | null> {
  try {
    return JSON.parse(require('fs').readFileSync(getStatePath(state), 'utf-8'));
  } catch {
    return null;
  }
}

export async function deleteStoredState(state: string): Promise<void> {
  try { require('fs').unlinkSync(getStatePath(state)); } catch {}
}

export async function deleteStoredToken(userId: string): Promise<void> {
  try { require('fs').unlinkSync(getTokenPath(userId)); } catch {}
}

export { DROPBOX_APP_KEY, DROPBOX_APP_SECRET, REDIRECT_URI, FRONTEND_URL };
