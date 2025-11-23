import { buildClearAuthCookies } from '../../../lib/portalSession.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const clears = buildClearAuthCookies();
  res.setHeader('Set-Cookie', clears);
  return res.status(200).json({ success: true });
}
