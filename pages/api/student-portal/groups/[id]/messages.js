import connectDb from '../../../../../lib/db';
import { getPortalSessionFromRequest } from '../../../../../lib/studentPortalAuth';
import GroupMessage from '../../../../../models/GroupMessage';
import Group from '../../../../../models/Group';
import Student from '../../../../../models/Student';

export default async function handler(req, res) {
  await connectDb();
  const session = await getPortalSessionFromRequest(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;
  const { id } = req.query;

  if (method === 'GET') {
    try {
      const PAGE_LIMIT = Math.min(parseInt(req.query.limit) || 40, 100);
      const before = req.query.before; // cursor: fetch messages older than this ID

      const query = { group: id };
      if (before) {
        // Only fetch messages older than the given message ID
        query._id = { $lt: before };
      }

      const messages = await GroupMessage.find(query)
        .sort({ created_at: -1 }) // Newest first so we can slice then reverse
        .populate('sender', 'first_name last_name profile_picture')
        .limit(PAGE_LIMIT + 1); // Fetch one extra to detect if more pages exist

      const hasMore = messages.length > PAGE_LIMIT;
      if (hasMore) messages.pop(); // Remove the extra record

      // Reverse to chronological order (oldest → newest) for the client
      messages.reverse();

      return res.status(200).json({ messages, hasMore });
    } catch (error) {
      console.error('Error fetching group messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  if (method === 'POST') {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Verify membership
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      if (!group.members.includes(session.student._id)) {
        return res.status(403).json({ error: 'You must be a member to send messages' });
      }

      const newMessage = await GroupMessage.create({
        group: id,
        sender: session.student._id,
        content
      });

      // Update group last message time
      group.last_message_at = new Date();
      await group.save();

      // Populate sender for real-time update
      await newMessage.populate('sender', 'first_name last_name profile_picture');

      // Emit socket event
      if (global.io) {
        global.io.to(`group:${id}`).emit('group:message', newMessage);
      }

      return res.status(201).json({ message: newMessage });
    } catch (error) {
      console.error('Error sending group message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  }

  if (method === 'DELETE') {
    try {
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const isAdmin = group.admins.some(adminId => adminId.toString() === session.student._id.toString());
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only admins can clear chat' });
      }

      await GroupMessage.deleteMany({ group: id });

      // Emit socket event to clear chat on clients
      if (global.io) {
        global.io.to(`group:${id}`).emit('group:chat_cleared');
      }

      return res.status(200).json({ success: true, message: 'Chat cleared' });
    } catch (error) {
      console.error('Error clearing chat:', error);
      return res.status(500).json({ error: 'Failed to clear chat' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
