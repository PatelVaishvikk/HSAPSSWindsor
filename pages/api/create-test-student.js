/**
 * Create Test Student API
 * Creates a test student account for login testing
 */
import connectDb from '../../lib/db.js';
import Student from '../../models/Student.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDb();

    // Check if test student already exists
    const existingStudent = await Student.findOne({ phone: '1234567890' });
    
    if (existingStudent) {
      return res.status(200).json({
        message: 'Test student already exists',
        credentials: {
          phone: '1234567890',
          password: 'test123'
        },
        student: {
          name: `${existingStudent.first_name} ${existingStudent.last_name}`,
          phone: existingStudent.phone
        }
      });
    }

    // Create password hash
    const passwordHash = await bcrypt.hash('test123', 10);

    // Create test student
    const testStudent = new Student({
      first_name: 'Test',
      last_name: 'Student',
      phone: '1234567890',
      phone_normalized: '1234567890',
      mail_id: 'test@example.com',
      portal_password_hash: passwordHash,
      portal_password_set_at: new Date(),
      study_institution: 'uwindsor',
      study_program: 'masters_applied_computing',
      study_level: 'masters',
      community_visibility: 'members',
      community_headline: 'Test Student Account',
      community_skills: ['JavaScript', 'React', 'Node.js'],
      community_interests: ['Web Development', 'AI', 'Networking']
    });

    await testStudent.save();

    return res.status(201).json({
      message: 'Test student created successfully!',
      credentials: {
        phone: '1234567890',
        password: 'test123'
      },
      student: {
        name: `${testStudent.first_name} ${testStudent.last_name}`,
        phone: testStudent.phone,
        id: testStudent._id
      }
    });

  } catch (error) {
    console.error('Create test student error:', error);
    return res.status(500).json({
      error: 'Failed to create test student',
      details: error.message
    });
  }
}
