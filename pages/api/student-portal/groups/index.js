import connectDb from '../../../../lib/db';
import { authenticateStudentFromRequest } from '../../../../lib/studentPortalAuth';
import Group from '../../../../models/Group';
import Student from '../../../../models/Student';

export default async function handler(req, res) {
  await connectDb();
  const auth = await authenticateStudentFromRequest(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }
  const session = { student: auth.student };

  const { method } = req;

  if (method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    try {
      const groups = await Group.find({ 
        $or: [
          { is_public: true },
          { is_public: { $exists: false } }
        ]
      })
        .sort({ last_message_at: -1 })
        .populate('members', 'first_name last_name profile_picture mail_id')
        .populate('admins', '_id') // Just need IDs to check membership
        .lean();

      // Add member count and check if current user is a member
      const groupsWithMeta = groups.map(group => {
        const isMember = group.members.some(m => m && m._id && m._id.toString() === session.student._id.toString());
        const hasRequested = group.join_requests && group.join_requests.some(r => r.toString() === session.student._id.toString());
        
        if (group.name === 'Test Group' || hasRequested) { // Log for specific cases to reduce noise
             console.log(`[GET GROUPS] Group: ${group.name}, User: ${session.student._id}, isMember: ${isMember}, hasRequested: ${hasRequested}`);
        }

        return {
          ...group,
          memberCount: group.members.length,
          isMember,
          hasRequested,
          admins: group.admins ? group.admins.map(a => a._id.toString()) : []
        };
      });

      return res.status(200).json({ groups: groupsWithMeta });
    } catch (error) {
      console.error('Error fetching groups:', error);
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }
  }

  if (method === 'POST') {
    try {
      const { name, description, icon } = req.body;
      console.log('[CREATE GROUP] Request:', { name, description, icon, studentId: session.student._id });

      if (!name) {
        return res.status(400).json({ error: 'Group name is required' });
      }

      const newGroup = await Group.create({
        name,
        description,
        icon: icon || 'users',
        created_by: session.student._id,
        admins: [session.student._id],
        members: [session.student._id] // Creator automatically joins
      });

      return res.status(201).json({ group: newGroup });
    } catch (error) {
      console.error('Error creating group:', error);
      return res.status(500).json({ error: 'Failed to create group' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
