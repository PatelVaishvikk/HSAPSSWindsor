import connectDb from '../../../lib/db.js';
import Student from '../../../models/Student.js';

export default async function handler(req, res) {
  console.log('[TEST-LOGIN] Request received');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[TEST-LOGIN] Connecting to DB...');
    await connectDb();
    console.log('[TEST-LOGIN] DB Connected');
    
    const count = await Student.countDocuments();
    console.log('[TEST-LOGIN] Student count:', count);
    
    // Try to find the specific student
    const phone = '5199927920';
    const student = await Student.findOne({ phone });
    console.log('[TEST-LOGIN] Found student:', Boolean(student));
    
    return res.status(200).json({
      success: true,
      studentCount: count,
      studentExists: Boolean(student),
      studentId: student?._id,
      hasPassword: Boolean(student?.portal_password_hash)
    });
  } catch (error) {
    console.error('[TEST-LOGIN] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
