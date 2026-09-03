import { tokens } from './lib.js';
import fetch from 'node-fetch';

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;
  tokens.delete(userId);
  res.status(200).json({ success: true });
};
