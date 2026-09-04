import { deleteStoredToken } from './lib.js';

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    await deleteStoredToken(userId);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Dropbox disconnect error:', err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Disconnect failed' });
  }
};
