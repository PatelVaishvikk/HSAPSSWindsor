import dbConnect from '../../../lib/dbConnect';
import Student from '../../../models/Student';
import { getPortalSessionFromRequest } from '../../../lib/studentPortalAuth';

const formatStudent = (student) => {
  if (!student) return null;
  const doc = student.toObject ? student.toObject() : student;
  return {
    id: doc._id ? doc._id.toString() : null,
    first_name: doc.first_name || '',
    last_name: doc.last_name || '',
    study: doc.study || '',
    community_headline: doc.community_headline || '',
    last_seen: doc.last_portal_login_at ? new Date(doc.last_portal_login_at).toISOString() : null,
    online: doc.last_portal_login_at ? Date.now() - new Date(doc.last_portal_login_at).getTime() <= 5 * 60 * 1000 : false
  };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const session = await getPortalSessionFromRequest(req, res);
    if (!session || !session.student) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, userId } = req.query;
    const targetId = userId || session.student._id;

    if (!type || !['followers', 'following'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "followers" or "following"' });
    }

    const student = await Student.findById(targetId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let userIds = [];
    if (type === 'followers') {
      userIds = student.followers || [];
    } else {
      userIds = student.following || [];
    }

    // Fetch all users
    const users = await Student.find({ _id: { $in: userIds } })
      .select('first_name last_name study community_headline last_portal_login_at')
      .lean();

    const formattedUsers = users.map(user => formatStudent(user));

    return res.status(200).json({ 
      [type]: formattedUsers,
      count: formattedUsers.length
    });

  } catch (error) {
    console.error('Followers API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
