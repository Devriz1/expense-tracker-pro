import { storeToken, getStoredState, deleteStoredState, FRONTEND_URL } from './lib.js';

export default async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/settings?tab=settings&dropbox_error=${encodeURIComponent(error_description || error)}`);
  }

  try {
    const response = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        grant_type: 'authorization_code',
        client_id: process.env.DROPBOX_APP_KEY,
        client_secret: process.env.DROPBOX_APP_SECRET,
        redirect_uri: process.env.DROPBOX_REDIRECT_URI || 'https://expense-tracker-pro-gamma-coral.vercel.app/api/dropbox/callback',
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    const stateStr = Array.isArray(state) ? state[0] : state || '';
    const userId = stateStr.split(':')[1] || stateStr;

    await storeToken(userId, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    });

    await deleteStoredState(stateStr);

    res.redirect(`${FRONTEND_URL}/settings?tab=settings&dropbox_connected=true`);
  } catch (err) {
    res.redirect(`${FRONTEND_URL}/settings?tab=settings&dropbox_error=${encodeURIComponent(err instanceof Error ? err.message : 'Connection failed')}`);
  }
};
