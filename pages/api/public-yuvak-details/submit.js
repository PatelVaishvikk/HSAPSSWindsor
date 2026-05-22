import connectDb from '../../../lib/db.js';
import Student from '../../../models/Student.js';
import {
  applyPublicYuvakUpdates,
  buildPublicYuvakPayload,
  findYuvakByPhone,
  normalizePhoneDigits,
  pickPublicYuvakUpdates,
  validatePublicYuvakPayload
} from '../../../lib/publicYuvakDetails.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const payload = req.body || {};
  const lookupPhone = payload.lookup_phone || payload.phone || '';
  const updates = pickPublicYuvakUpdates(payload);
  const submittedPhone = updates.phone || lookupPhone;

  if (normalizePhoneDigits(submittedPhone).length < 10) {
    return res.status(400).json({ error: 'Enter a valid phone number' });
  }

  try {
    await connectDb();

    let student = await findYuvakByPhone(Student, lookupPhone);
    if (!student && normalizePhoneDigits(lookupPhone) !== normalizePhoneDigits(submittedPhone)) {
      student = await findYuvakByPhone(Student, submittedPhone);
    }

    const validationErrors = validatePublicYuvakPayload(
      { ...updates, phone: submittedPhone },
      student
    );
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join('; ') });
    }

    if (!student) {
      const newStudent = new Student({
        mail_id: `public.${normalizePhoneDigits(submittedPhone)}@hsapss.ca`,
        mukt_type: 'Yuvak'
      });
      const { changedFields } = applyPublicYuvakUpdates(
        newStudent,
        { ...updates, phone: submittedPhone }
      );
      await newStudent.save();

      return res.status(201).json({
        status: 'created',
        changedFields,
        profile: buildPublicYuvakPayload(newStudent)
      });
    }

    const { changedFields } = applyPublicYuvakUpdates(
      student,
      { ...updates, phone: submittedPhone }
    );
    await student.save();

    return res.status(200).json({
      status: 'updated',
      changedFields,
      profile: buildPublicYuvakPayload(student)
    });
  } catch (error) {
    console.error('Public yuvak submit error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: messages.join('; ') });
    }
    return res.status(500).json({ error: 'Unable to save details right now' });
  }
}
