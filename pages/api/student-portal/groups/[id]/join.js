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

      const userId = session.student._id.toString();
      const isMember = group.members.some(m => m.toString() === userId);

      console.log(`[JOIN API] User: ${userId}, Group: ${id}, isMember: ${isMember}`);

      if (isMember) {
        console.log('[JOIN API] User is already a member. Removing...');
        // Leave group
        group.members = group.members.filter(m => m.toString() !== userId);
        // Also remove from admins if they were one
        group.admins = group.admins.filter(a => a.toString() !== userId);
        await group.save();

        if (global.io) {
          global.io.to(`group:${id}`).emit('group:member_updated');
        }

        return res.status(200).json({ success: true, joined: false, message: 'Left group' });
      } else {
        console.log('[JOIN API] User is NOT a member. Checking requests...');
        // Check if already requested
        const hasRequested = group.join_requests && group.join_requests.includes(userId);
        
        if (hasRequested) {
            return res.status(400).json({ error: 'Join request already pending' });
        }

        // Add to join requests
        if (!group.join_requests) group.join_requests = [];
        group.join_requests.push(userId);
        
        console.log('[JOIN API] Adding to join_requests. Members:', group.members);
        console.log('[JOIN API] Join Requests:', group.join_requests);
        
        await group.save();
        
        // Notify admins (optional, could add notification logic here)

        return res.status(200).json({ success: true, joined: false, status: 'requested', message: 'Join request sent' });
      }
    } catch (error) {
      console.error('Error toggling group membership:', error);
      return res.status(500).json({ error: 'Failed to update membership' });
    }
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
