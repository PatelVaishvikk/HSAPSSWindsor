import connectDb from '../../../lib/db.js';
import Student from '../../../models/Student.js';
import {
  buildPortalStudentPayload,
  getPortalPassword
} from '../../../lib/studentPortalUtils.js';
import { verifyStudentPortalSecret } from '../../../lib/studentPortalAuth.js';

const trimPhone = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizePhoneDigits = (value) =>
  typeof value === 'string' ? value.replace(/\D+/g, '') : '';

const PORTAL_ADMIN_PHONES = ['5199927920', '5199818012'];
const ADMIN_SHORTCUTS = [
  {
    href: '/admin/dashboard',
    label: 'Admin Dashboard',
    icon: 'fas fa-gauge-high'
  },
  {
    href: '/students-table',
    label: 'Manage Yuvaks',
    icon: 'fas fa-users'
  },
  {
    href: '/attendance',
    label: 'Attendance',
    icon: 'fas fa-calendar-check'
  }
];

const canAccessAdminTools = (student) => {
  if (!student) {
    return false;
  }
  const normalizedPhone = normalizePhoneDigits(student.phone);
  const storedNormalized = normalizePhoneDigits(student.phone_normalized);
  return PORTAL_ADMIN_PHONES.some(
    (adminPhone) => adminPhone === normalizedPhone || adminPhone === storedNormalized
  );
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { phone, password } = req.body || {};

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone number and password are required' });
  }

  try {
    await connectDb();
    const trimmedPhone = trimPhone(phone);
    const normalizedDigits = normalizePhoneDigits(trimmedPhone);

    if (!trimmedPhone && !normalizedDigits) {
      return res.status(400).json({ error: 'Please enter a valid phone number' });
    }

    const phoneConditions = [];
    if (normalizedDigits) {
      phoneConditions.push({ phone_normalized: normalizedDigits });
      const pattern = normalizedDigits.split('').join('\\D*');
      phoneConditions.push({
        phone: { $regex: `^\\D*${pattern}\\D*$`, $options: 'i' }
      });
    }
    if (trimmedPhone) {
      phoneConditions.push({ phone: trimmedPhone });
    }

    const student = await Student.findOne(
      phoneConditions.length > 0 ? { $or: phoneConditions } : { phone: trimmedPhone }
    );

    if (!student) {
      return res.status(404).json({ error: 'No student found with that phone number' });
    }

    const isValid = await verifyStudentPortalSecret(student, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    student.last_portal_login_at = new Date();
    await student.save();

    const payload = buildPortalStudentPayload(student);
    const allowAdminAccess = canAccessAdminTools(student);
    return res.status(200).json({
      student: payload,
      meta: {
        has_custom_password: Boolean(student.portal_password_hash),
        used_default_password: password === getPortalPassword(),
        can_access_admin: allowAdminAccess,
        admin_shortcuts: allowAdminAccess ? ADMIN_SHORTCUTS : [],
        last_portal_login_at: student.last_portal_login_at
          ? new Date(student.last_portal_login_at).toISOString()
          : null
      }
    });
  } catch (error) {
    console.error('Student portal login error:', error);
    return res.status(500).json({ error: 'Unable to process login at this time' });
  }
}
