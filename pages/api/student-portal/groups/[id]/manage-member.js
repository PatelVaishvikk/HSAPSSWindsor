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
  const { memberId, action } = req.body; // action: 'promote' | 'demote' for POST

  try {
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const requesterId = session.student._id.toString();
    const isAdmin = group.admins.some(adminId => adminId.toString() === requesterId);

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can manage members' });
    }

    if (method === 'POST') {
      if (!memberId || !action) {
        return res.status(400).json({ error: 'Member ID and action are required' });
      }

      if (action === 'promote') {
        if (!group.admins.includes(memberId)) {
          group.admins.push(memberId);
          await group.save();
          
          if (global.io) {
            global.io.to(`group:${id}`).emit('group:member_updated');
          }
        }
        return res.status(200).json({ success: true, message: 'Member promoted to admin' });
      } 
      
      if (action === 'demote') {
        // Prevent demoting self if you are the only admin (optional safety, but good to have)
        if (memberId === requesterId && group.admins.length === 1) {
            return res.status(400).json({ error: 'Cannot demote the last admin' });
        }

        group.admins = group.admins.filter(a => a.toString() !== memberId);
        await group.save();

        if (global.io) {
          global.io.to(`group:${id}`).emit('group:member_updated');
        }

        return res.status(200).json({ success: true, message: 'Member demoted' });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    if (method === 'DELETE') {
      // Kick member
      // memberId comes from body in DELETE requests usually, or query. Let's assume body for consistency with plan, 
      // but standard REST often uses URL. Next.js DELETE body parsing can be tricky sometimes but usually works with express middleware.
      // If body is empty, we might need to check query. Let's check body first.
      const targetId = req.body.memberId || req.query.memberId;

      if (!targetId) {
        return res.status(400).json({ error: 'Member ID is required' });
      }

      if (targetId === requesterId) {
         return res.status(400).json({ error: 'Cannot kick yourself. Use "Leave Group" instead.' });
      }

      // Remove from members
      group.members = group.members.filter(m => m.toString() !== targetId);
      // Remove from admins if they were one
      group.admins = group.admins.filter(a => a.toString() !== targetId);

      await group.save();
      
      // Emit socket event
      // Emit socket event
      if (global.io) {
        global.io.to(`group:${id}`).emit('group:member_removed', { memberId: targetId });
        global.io.to(`group:${id}`).emit('group:member_updated'); // Trigger refresh for others
      }

      return res.status(200).json({ success: true, message: 'Member removed' });
    }

    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).end(`Method ${method} Not Allowed`);

  } catch (error) {
    console.error('Error managing member:', error);
    return res.status(500).json({ error: 'Failed to manage member' });
  }
}
