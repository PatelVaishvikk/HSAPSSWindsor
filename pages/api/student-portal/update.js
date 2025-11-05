import connectDb from '../../../lib/db.js';
import {
  PORTAL_EDITABLE_FIELDS,
  applyPortalUpdates,
  buildPortalStudentPayload
} from '../../../lib/studentPortalUtils.js';
import { authenticateStudentFromRequest } from '../../../lib/studentPortalAuth.js';

const pickAllowedUpdates = (updates) => {
  if (!updates || typeof updates !== 'object') {
    return {};
  }

  const allowed = {};
  PORTAL_EDITABLE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      allowed[field] = updates[field];
    }
  });
  return allowed;
};

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { studentId, password, updates } = req.body || {};

  if (!studentId || !password) {
    return res.status(400).json({ error: 'Missing student id or password' });
  }

  try {
    await connectDb();
    const authResult = await authenticateStudentFromRequest(req);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }
    const { student } = authResult;

    const filteredUpdates = pickAllowedUpdates(updates);
    const { changedFields } = applyPortalUpdates(student, filteredUpdates);

    await student.save();

    const payload = buildPortalStudentPayload(student);
    return res.status(200).json({
      student: payload,
      changedFields,
      last_portal_update_at: student.last_portal_update_at
        ? student.last_portal_update_at.toISOString()
        : null
    });
  } catch (error) {
    console.error('Student portal update error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: messages.join('; ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    return res.status(500).json({ error: 'Unable to update student at this time' });
  }
}
