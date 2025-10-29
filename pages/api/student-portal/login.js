import connectDb from '../../../lib/db.js';
import Student from '../../../models/Student.js';
import {
  buildPortalStudentPayload,
  getPortalPassword
} from '../../../lib/studentPortalUtils.js';

const normalizePhone = (value) => (typeof value === 'string' ? value.trim() : '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { phone, password } = req.body || {};

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone number and password are required' });
  }

  if (password !== getPortalPassword()) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  try {
    await connectDb();
    const student = await Student.findOne({ phone: normalizePhone(phone) });

    if (!student) {
      return res.status(404).json({ error: 'No student found with that phone number' });
    }

    const payload = buildPortalStudentPayload(student);
    return res.status(200).json({ student: payload });
  } catch (error) {
    console.error('Student portal login error:', error);
    return res.status(500).json({ error: 'Unable to process login at this time' });
  }
}
