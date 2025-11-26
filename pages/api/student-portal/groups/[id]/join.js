import connectDb from '../../../../../lib/db';
import { getPortalSessionFromRequest } from '../../../../../lib/studentPortalAuth';
import Group from '../../../../../models/Group';

export default async function handler(req, res) {
  await connectDb();
  const session = await getPortalSessionFromRequest(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;
  const { id } = req.query;

  if (method === 'POST') {
    try {
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const userId = session.student._id;
      const isMember = group.members.includes(userId);

      if (isMember) {
        // Leave group
        group.members = group.members.filter(m => m.toString() !== userId.toString());
        await group.save();
        return res.status(200).json({ success: true, joined: false, message: 'Left group' });
      } else {
        // Join group
        group.members.push(userId);
        await group.save();
        return res.status(200).json({ success: true, joined: true, message: 'Joined group' });
      }
    } catch (error) {
      console.error('Error toggling group membership:', error);
      return res.status(500).json({ error: 'Failed to update membership' });
    }
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
