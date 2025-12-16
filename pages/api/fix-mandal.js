import connectDb from '../../lib/db';
import Student from '../../models/Student';

export default async function handler(req, res) {
  try {
    await connectDb();
    const id = '680da10c6a7b047db058465b';
    const result = await Student.findByIdAndUpdate(id, { mandal_name: 'Windsor' }, { new: true });
    res.json({ message: 'Fixed mandal_name to Windsor', student: result });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
