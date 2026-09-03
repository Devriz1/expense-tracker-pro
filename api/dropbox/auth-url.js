import crypto from 'crypto';

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI || 'https://expense-tracker-pro-gamma-coral.vercel.app/api/dropbox/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://expense-tracker-pro-gamma-coral.vercel.app';

const tokens = new Map();

export default async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  const randomState = crypto.randomBytes(16).toString('hex');
  const state = `${randomState}:${userId || ''}`;

  const url = new URL('https://www.dropbox.com/oauth2/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', DROPBOX_APP_KEY);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('token_access_type', 'offline');
  url.searchParams.set('state', state);

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ url: url.toString(), state });
};
