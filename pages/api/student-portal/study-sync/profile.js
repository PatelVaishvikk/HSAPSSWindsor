import connectDb from '../../../../lib/db.js';
import StudyProfile from '../../../../models/StudyProfile.js';
import { getPortalSessionFromRequest } from '../../../../lib/studentPortalAuth.js';

export default async function handler(req, res) {
  await connectDb();

  const session = await getPortalSessionFromRequest(req, res);
  const student = session?.student;

  if (!student) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const profile = await StudyProfile.findOne({ student: student._id });
      return res.status(200).json({ profile });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { study_style, study_time, courses, goals, bio } = req.body;

      const profile = await StudyProfile.findOneAndUpdate(
        { student: student._id },
        {
          student: student._id,
          study_style,
          study_time,
          courses,
          goals,
          bio
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({ profile });
    } catch (error) {
      console.error('Study Profile Error:', error);
      return res.status(500).json({ error: 'Failed to save profile' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
