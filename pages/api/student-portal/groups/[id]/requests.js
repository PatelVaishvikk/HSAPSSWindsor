import connectDb from '../../../../../lib/db';
import { getPortalSessionFromRequest } from '../../../../../lib/studentPortalAuth';
import Group from '../../../../../models/Group';
import Student from '../../../../../models/Student'; // Ensure Student model is loaded

export default async function handler(req, res) {
  await connectDb();
  const session = await getPortalSessionFromRequest(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;
  const { id } = req.query;

  try {
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const requesterId = session.student._id.toString();
    const isAdmin = group.admins.some(adminId => adminId.toString() === requesterId);

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can manage requests' });
    }

    if (method === 'GET') {
        // Populate join requests with student details
        await group.populate('join_requests', 'first_name last_name profile_picture mail_id');
        return res.status(200).json({ requests: group.join_requests || [] });
    }

    if (method === 'POST') {
        const { requesterId: targetId, action } = req.body; // action: 'approve' | 'reject'

        if (!targetId || !action) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        // Remove from requests in all cases
        group.join_requests = (group.join_requests || []).filter(r => r.toString() !== targetId);

        if (action === 'approve') {
            // Add to members if not already there
            if (!group.members.some(m => m.toString() === targetId)) {
                group.members.push(targetId);
            }
        }

        await group.save();

        if (global.io) {
            global.io.to(`group:${id}`).emit('group:member_updated');
        }

        return res.status(200).json({ success: true, message: `Request ${action}ed` });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${method} Not Allowed`);

  } catch (error) {
    console.error('Error managing requests:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
