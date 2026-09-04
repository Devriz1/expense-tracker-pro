import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const authUrl = (await import('../api/dropbox/auth-url.js')).default;
const callback = (await import('../api/dropbox/callback.js')).default;
const backup = (await import('../api/dropbox/backup.js')).default;
const disconnect = (await import('../api/dropbox/disconnect.js')).default;
const health = (await import('../api/dropbox/health.js')).default;

app.get('/api/dropbox/auth-url', authUrl);
app.get('/api/dropbox/callback', callback);
app.post('/api/dropbox/backup', backup);
app.post('/api/dropbox/disconnect', disconnect);
app.get('/api/dropbox/health', health);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Dropbox API server running on http://localhost:${PORT}`);
});
