import connectDb from '../../../lib/db.js';
import Student from '../../../models/Student.js';
import {
  buildPublicYuvakPayload,
  findYuvakByPhone,
  getMissingRequiredFields,
  normalizePhoneDigits,
  PUBLIC_REQUIRED_LABELS
} from '../../../lib/publicYuvakDetails.js';

const labelMissingFields = (fields = []) =>
  fields.map((field) => ({
    field,
    label: PUBLIC_REQUIRED_LABELS[field] || field
  }));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const phone = req.body?.phone || '';
  if (normalizePhoneDigits(phone).length < 10) {
    return res.status(400).json({ error: 'Enter a valid phone number' });
  }

  try {
    await connectDb();
    const student = await findYuvakByPhone(Student, phone);

    if (!student) {
      const missingFields = getMissingRequiredFields({ phone });
      return res.status(200).json({
        exists: false,
        profile: { phone },
        missingFields: labelMissingFields(missingFields)
      });
    }

    const profile = buildPublicYuvakPayload(student);
    const missingFields = getMissingRequiredFields(profile);

    return res.status(200).json({
      exists: true,
      profile,
      missingFields: labelMissingFields(missingFields)
    });
  } catch (error) {
    console.error('Public yuvak lookup error:', error);
    return res.status(500).json({ error: 'Unable to check this phone number right now' });
  }
}
