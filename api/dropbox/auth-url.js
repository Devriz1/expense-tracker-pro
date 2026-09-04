import crypto from 'crypto';
import { DROPBOX_APP_KEY, DROPBOX_APP_SECRET, REDIRECT_URI, FRONTEND_URL } from './lib.js';

export default async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  const randomState = crypto.randomBytes(16).toString('hex');
  const state = `${randomState}:${userId || ''}`;

  const stateData = { userId: userId || '', created_at: Date.now() };
  const fs = require('fs');
  try { fs.mkdirSync('/tmp/dropbox-states', { recursive: true }); } catch {}
  fs.writeFileSync(`/tmp/dropbox-states/${state}.json`, JSON.stringify(stateData));

  const url = new URL('https://www.dropbox.com/oauth2/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', DROPBOX_APP_KEY);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('token_access_type', 'offline');
  url.searchParams.set('state', state);

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ url: url.toString(), state });
};
