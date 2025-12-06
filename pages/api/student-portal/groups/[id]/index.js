import connectDb from '../../../../../lib/db';
import { getPortalSessionFromRequest } from '../../../../../lib/studentPortalAuth';
import Group from '../../../../../models/Group';
import GroupMessage from '../../../../../models/GroupMessage';

export default async function handler(req, res) {
  await connectDb();
  const session = await getPortalSessionFromRequest(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;
  const { id } = req.query;

  if (method === 'DELETE') {
    try {
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const isAdmin = group.admins.some(adminId => adminId.toString() === session.student._id.toString());
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only admins can delete the group' });
      }

      // Delete all messages
      await GroupMessage.deleteMany({ group: id });
      
      // Delete the group
      await Group.findByIdAndDelete(id);

      // Emit socket event
      if (global.io) {
        global.io.to(`group:${id}`).emit('group:deleted');
      }

      return res.status(200).json({ success: true, message: 'Group deleted' });
    } catch (error) {
      console.error('Error deleting group:', error);
      return res.status(500).json({ error: 'Failed to delete group' });
    }
  }

  res.setHeader('Allow', ['DELETE']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
