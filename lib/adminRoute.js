import { isAdminRequest } from './adminAuth.js';

export function requireAdmin(req, res) {
  if (isAdminRequest(req)) {
    return true;
  }
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}
