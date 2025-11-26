import connectDb from '../../../../lib/db';
import { getPortalSessionFromRequest } from '../../../../lib/studentPortalAuth';
import Group from '../../../../models/Group';
import Student from '../../../../models/Student';

export default async function handler(req, res) {
  await connectDb();
  const session = await getPortalSessionFromRequest(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;

  if (method === 'GET') {
    try {
      const groups = await Group.find({ is_public: true })
        .sort({ last_message_at: -1 })
        .populate('members', 'first_name last_name profile_picture')
        .lean();

      // Add member count and check if current user is a member
      const groupsWithMeta = groups.map(group => ({
        ...group,
        memberCount: group.members.length,
        isMember: group.members.some(m => m._id.toString() === session.student._id.toString())
      }));

      return res.status(200).json({ groups: groupsWithMeta });
    } catch (error) {
      console.error('Error fetching groups:', error);
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }
  }

  if (method === 'POST') {
    try {
      const { name, description, icon } = req.body;

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
