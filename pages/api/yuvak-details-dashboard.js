import connectDb from '../../lib/db.js';
import Student from '../../models/Student.js';
import { requireAdmin } from '../../lib/adminRoute.js';

const DETAIL_UPDATE_FIELDS = new Set([
  'first_name',
  'last_name',
  'phone',
  'date_of_birth',
  'address',
  'mandal_name'
]);

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : value ? String(value).trim() : '';

const formatDateForClient = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const formatDateTimeForClient = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const isUnitPart = (value) => /^(apt|apartment|unit|suite)\b/i.test(value) || /^#/.test(value);

const cleanUnitPart = (value) =>
  normalizeString(value)
    .replace(/^(apt|apartment|unit|suite)\s*/i, '')
    .replace(/^#\s*/, '')
    .trim();

const parseAddress = (address) => {
  const fullAddress = normalizeString(address);
  const parts = fullAddress
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      street: '',
      apartment: '',
      city: '',
      state: '',
      fullAddress
    };
  }

  const [street = '', second = '', third = '', ...remaining] = parts;
  if (second && isUnitPart(second)) {
    return {
      street,
      apartment: cleanUnitPart(second),
      city: third,
      state: remaining.join(', '),
      fullAddress
    };
  }

  return {
    street,
    apartment: '',
    city: second,
    state: [third, ...remaining].filter(Boolean).join(', '),
    fullAddress
  };
};

const countBy = (records, getter) => {
  const counts = new Map();
  records.forEach((record) => {
    const key = normalizeString(getter(record)) || 'Not set';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const serializeStudent = (student) => {
  const addressParts = parseAddress(student.address);
  const updateFields = Array.isArray(student.last_portal_update_fields)
    ? student.last_portal_update_fields.filter(Boolean)
    : [];
  const hasDetailUpdate = updateFields.some((field) => DETAIL_UPDATE_FIELDS.has(field));
  const hasCompleteAddress = Boolean(addressParts.street && addressParts.city && addressParts.state);

  return {
    _id: student._id.toString(),
    first_name: normalizeString(student.first_name),
    last_name: normalizeString(student.last_name),
    name: [student.first_name, student.last_name].map(normalizeString).filter(Boolean).join(' ') || 'Unnamed Yuvak',
    phone: normalizeString(student.phone),
    phone_normalized: normalizeString(student.phone_normalized),
    mail_id: normalizeString(student.mail_id),
    date_of_birth: formatDateForClient(student.date_of_birth),
    mandal_name: normalizeString(student.mandal_name),
    mukt_type: normalizeString(student.mukt_type || 'Yuvak'),
    address: addressParts.fullAddress,
    address_street: addressParts.street,
    apartment_number: addressParts.apartment,
    address_city: addressParts.city,
    address_state: addressParts.state,
    has_complete_address: hasCompleteAddress,
    last_portal_update_at: formatDateTimeForClient(student.last_portal_update_at),
    last_portal_update_fields: updateFields,
    has_detail_update: hasDetailUpdate,
    created_at: formatDateTimeForClient(student.created_at),
    updated_at: formatDateTimeForClient(student.updated_at)
  };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const authorized = await requireAdmin(req, res);
  if (!authorized) {
    return;
  }

  try {
    await connectDb();

    const { isSuper, mandal } = req.adminRights;
    const filter = {};
    if (!isSuper && mandal) {
      filter.mandal_name = mandal;
    } else if (!isSuper && !mandal) {
      filter.mandal_name = '__RESTRICTED_NO_MANDAL__';
    }

    const students = await Student.find(filter)
      .select('first_name last_name phone phone_normalized mail_id date_of_birth address mandal_name mukt_type last_portal_update_at last_portal_update_fields created_at updated_at')
      .sort({ last_portal_update_at: -1, updated_at: -1, last_name: 1, first_name: 1 })
      .lean();

    const records = students.map(serializeStudent);

    return res.status(200).json({
      students: records,
      stats: {
        total: records.length,
        formUpdates: records.filter((student) => student.has_detail_update || student.last_portal_update_at).length,
        completeAddress: records.filter((student) => student.has_complete_address).length,
        missingAddress: records.filter((student) => !student.has_complete_address).length,
        missingBirthdate: records.filter((student) => !student.date_of_birth).length
      },
      mandals: countBy(records, (student) => student.mandal_name),
      cities: countBy(records, (student) => student.address_city)
    });
  } catch (error) {
    console.error('Yuvak details dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load yuvak details dashboard' });
  }
}
