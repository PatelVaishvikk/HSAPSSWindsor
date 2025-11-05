import { createAdminSessionCookie, verifyAdminPassword } from '../../../lib/adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (!verifyAdminPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.setHeader('Set-Cookie', createAdminSessionCookie());
  return res.status(200).json({ success: true });
}
