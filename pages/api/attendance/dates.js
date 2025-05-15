import dbConnect from '../../../lib/dbConnect';
import Attendance from '../../../models/Attendance';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Aggregate attendance data by date with student details
    const dateStats = await Attendance.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentDetails'
        }
      },
      {
        $unwind: '$studentDetails'
      },
      {
        $group: {
          _id: '$assemblyDate',
          totalCount: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ['$attended', true] }, 1, 0] }
          },
          students: {
            $push: {
              id: '$studentDetails._id',
              name: { 
                $concat: ['$studentDetails.first_name', ' ', '$studentDetails.last_name'] 
              },
              grade: '$studentDetails.grade',
              attended: '$attended'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalCount: 1,
          presentCount: 1,
          students: 1,
          absentCount: { 
            $subtract: ['$totalCount', '$presentCount'] 
          }
        }
      },
      {
        $sort: { date: -1 }
      }
    ]);

    return res.status(200).json({ dates: dateStats });
  } catch (error) {
    console.error('Error fetching attendance dates:', error);
    return res.status(500).json({ error: 'Failed to fetch attendance dates' });
  }
} 