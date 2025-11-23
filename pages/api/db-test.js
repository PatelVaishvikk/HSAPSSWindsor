/**
 * Database Connection Test API
 * Tests if MongoDB connection is working
 */
import connectDb from '../../lib/db.js';
import Student from '../../models/Student.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to connect to database
    await connectDb();
    
    // Try to count students
    const studentCount = await Student.countDocuments();
    
    return res.status(200).json({
      status: 'success',
      message: 'Database connection successful',
      studentCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
