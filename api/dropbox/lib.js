import crypto from 'crypto';
import fetch from 'node-fetch';

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI || 'https://expense-tracker-pro-gamma-coral.vercel.app/api/dropbox/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://expense-tracker-pro-gamma-coral.vercel.app';

const tokens = new Map();
const stateMap = new Map();

export async function getValidAccessToken(userId) {
  const tokenData = tokens.get(userId);
  if (!tokenData) throw new Error('Not connected');

  if (Date.now() < tokenData.expires_at - 60000) {
    return tokenData.access_token;
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
  if (data.error) throw new Error(data.error_description);

  tokenData.access_token = data.access_token;
  tokenData.expires_at = Date.now() + data.expires_in * 1000;
  tokens.set(userId, tokenData);

  return data.access_token;
}

export { tokens, stateMap, DROPBOX_APP_KEY, DROPBOX_APP_SECRET, REDIRECT_URI, FRONTEND_URL };
