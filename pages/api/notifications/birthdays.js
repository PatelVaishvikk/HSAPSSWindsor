import dbConnect from '../../../lib/dbConnect';
import Student from '../../../models/Student';
import { format } from 'date-fns';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Get today's date in MM-DD format
    const today = format(new Date(), 'MM-dd');
    
    // Find students whose birthdays are today
    // Using $expr to compare month and day parts of the date
    const students = await Student.find({
      $expr: {
        $and: [
          { $eq: [{ $month: '$dateOfBirth' }, parseInt(today.split('-')[0])] },
          { $eq: [{ $dayOfMonth: '$dateOfBirth' }, parseInt(today.split('-')[1])] }
        ]
      }
    }).select('first_name last_name dateOfBirth grade');

    // Format the response
    const birthdays = students.map(student => ({
      id: student._id,
      name: `${student.first_name} ${student.last_name}`,
      grade: student.grade,
      dateOfBirth: student.dateOfBirth,
      age: new Date().getFullYear() - new Date(student.dateOfBirth).getFullYear()
    }));

    return res.status(200).json({ birthdays });
  } catch (error) {
    console.error('Error fetching birthdays:', error);
    return res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
} 