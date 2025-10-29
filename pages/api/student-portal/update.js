import connectDb from '../../../lib/db.js';
import Student from '../../../models/Student.js';
import {
  PORTAL_EDITABLE_FIELDS,
  applyPortalUpdates,
  buildPortalStudentPayload,
  getPortalPassword
} from '../../../lib/studentPortalUtils.js';

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

  if (password !== getPortalPassword()) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  try {
    await connectDb();
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const filteredUpdates = pickAllowedUpdates(updates);
    applyPortalUpdates(student, filteredUpdates);

    await student.save();

    const payload = buildPortalStudentPayload(student);
    return res.status(200).json({ student: payload });
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
