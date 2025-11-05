import connectDb from '../../../lib/db.js';
import Student from '../../../models/Student.js';
import { hashPortalPassword } from '../../../lib/studentPortalAuth.js';

const trimPhone = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizePhoneDigits = (value) =>
  typeof value === 'string' ? value.replace(/\D+/g, '') : '';

const MIN_PASSWORD_LENGTH = 8;

const buildPhoneConditions = (rawPhone) => {
  const trimmed = trimPhone(rawPhone);
  const digits = normalizePhoneDigits(trimmed);
  const conditions = [];

  if (digits) {
    conditions.push({ phone_normalized: digits });
    const pattern = digits.split('').join('\\D*');
    conditions.push({
      phone: { $regex: `^\\D*${pattern}\\D*$`, $options: 'i' },
    });
  }

  if (trimmed) {
    conditions.push({ phone: trimmed });
  }

  return { trimmed, digits, conditions };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { phone, password, confirmPassword } = req.body || {};

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone number and password are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    });
  }

  try {
    await connectDb();

    const { digits, conditions } = buildPhoneConditions(phone);

    const lookup =
      conditions.length > 0
        ? { $or: conditions }
        : { phone: trimPhone(phone) };

    const student = await Student.findOne(lookup);
    if (!student) {
      return res.status(404).json({ error: 'No student found with that phone number' });
    }

    if (student.portal_password_hash) {
      return res
        .status(409)
        .json({ error: 'Account already registered. Try logging in or reset the password.' });
    }

    const hash = await hashPortalPassword(password);
    student.portal_password_hash = hash;
    student.portal_password_set_at = new Date();
    if (!student.phone_normalized && digits) {
      student.phone_normalized = digits;
    }
    await student.save();

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('Student portal registration error:', error);
    return res.status(500).json({ error: 'Unable to register right now' });
  }
}
