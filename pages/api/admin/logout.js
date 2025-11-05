import { createAdminLogoutCookie } from '../../../lib/adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  res.setHeader('Set-Cookie', createAdminLogoutCookie());
  return res.status(200).json({ success: true });
}
