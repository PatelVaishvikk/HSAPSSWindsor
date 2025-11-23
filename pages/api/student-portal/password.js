import connectDb from '../../../lib/db.js';
import {
  hashPortalPassword,
  verifyStudentPortalSecret,
  authenticateStudentFromRequest
} from '../../../lib/studentPortalAuth.js';

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { currentPassword, newPassword } = req.body || {};
  const current = sanitizeString(currentPassword);
  const next = sanitizeString(newPassword);

  if (!current || !next) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (next.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  try {
    await connectDb();

    const authResult = await authenticateStudentFromRequest(req, res);
    if (authResult?.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }
    const { student } = authResult;

    const isCurrentValid = await verifyStudentPortalSecret(student, current);
    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = await hashPortalPassword(next);
    student.portal_password_hash = hash;
    student.portal_password_set_at = new Date();

    await student.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Student portal password update error:', error);
    return res.status(500).json({ error: 'Unable to update password right now' });
  }
}
