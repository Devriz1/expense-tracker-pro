import { getValidAccessToken } from './lib.js';

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, backupData } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const accessToken = await getValidAccessToken(userId);

    const json = JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: backupData,
    }, null, 2);

    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: '/backup_latest.json',
          mode: { '.tag': 'overwrite' },
          autorename: false,
          mute: true,
        }),
      },
      body: json,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    res.status(200).json({ success: true, message: 'Backup uploaded to Dropbox' });
  } catch (err) {
    console.error('Dropbox backup error:', err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Backup failed' });
  }
};
