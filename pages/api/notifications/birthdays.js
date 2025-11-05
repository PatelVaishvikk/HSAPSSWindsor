import dbConnect from '../../../lib/dbConnect';
import Student from '../../../models/Student';
import { format } from 'date-fns';
import { requireAdmin } from '../../../lib/adminRoute.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req, res)) {
    return;
  }

  try {
    await dbConnect();

    // Get today's date in MM-DD format
    const today = format(new Date(), 'MM-dd');
    
    // Find students whose birthdays are today
    // Using $expr to compare month and day parts of the date
    const [monthPart, dayPart] = today.split('-').map((part) => parseInt(part, 10));

    const students = await Student.find({
      date_of_birth: { $ne: null },
      $expr: {
        $and: [
          { $eq: [{ $month: '$date_of_birth' }, monthPart] },
          { $eq: [{ $dayOfMonth: '$date_of_birth' }, dayPart] }
        ]
      }
    }).select('first_name last_name date_of_birth study');

    // Format the response
    const birthdays = students.map(student => ({
      id: student._id,
      name: `${student.first_name} ${student.last_name}`,
      study: student.study || '',
      date_of_birth: student.date_of_birth,
      age: student.date_of_birth
        ? new Date().getFullYear() - new Date(student.date_of_birth).getFullYear()
        : null
    }));

    return res.status(200).json({ birthdays });
  } catch (error) {
    console.error('Error fetching birthdays:', error);
    return res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
} 
