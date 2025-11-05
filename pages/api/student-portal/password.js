import connectDb from '../../../lib/db.js';
import Student from '../../../models/Student.js';
import {
  hashPortalPassword,
  verifyStudentPortalSecret
} from '../../../lib/studentPortalAuth.js';

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { studentId, currentPassword, newPassword } = req.body || {};
  const cleanId = sanitizeString(studentId);
  const current = sanitizeString(currentPassword);
  const next = sanitizeString(newPassword);

  if (!cleanId || !current || !next) {
    return res.status(400).json({ error: 'Student id, current password, and new password are required' });
  }

  if (next.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  try {
    await connectDb();

    const student = await Student.findById(cleanId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

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
