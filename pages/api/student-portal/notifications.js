import connectDb from '../../../lib/db.js';
import Notification from '../../../models/Notification.js';
import Student from '../../../models/Student.js'; // Ensure Student model is registered
import { getStudentFromRequest } from '../../../lib/studentPortalUtils.js';

export default async function handler(req, res) {
  try {
    await connectDb();
    const student = await getStudentFromRequest(req);
    
    if (!student) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Fetch notifications
      const notifications = await Notification.find({ recipient: student._id })
        .sort({ created_at: -1 })
        .limit(50)
        .populate('sender', 'first_name last_name profile_picture');

      const unreadCount = await Notification.countDocuments({ 
        recipient: student._id, 
        read: false 
      });

      return res.status(200).json({ notifications, unreadCount });
    } 
    
    else if (req.method === 'PUT') {
      // Mark as read
      const { notificationId, markAll } = req.body;

      if (markAll) {
        await Notification.updateMany(
          { recipient: student._id, read: false },
          { $set: { read: true } }
        );
        return res.status(200).json({ success: true, message: 'All marked as read' });
      }

      if (notificationId) {
        await Notification.findOneAndUpdate(
          { _id: notificationId, recipient: student._id },
          { $set: { read: true } }
        );
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid request' });
    }

    else if (req.method === 'DELETE') {
      const { clearAllRead } = req.query;
      
      // Check query param first for clearAllRead
      if (clearAllRead === 'true') {
        await Notification.deleteMany({ recipient: student._id, read: true });
        return res.status(200).json({ success: true, message: 'Read notifications cleared' });
      }

      // Handle single notification delete via body or query
      const notificationId = req.body?.notificationId || req.query.notificationId;

      if (notificationId) {
        await Notification.findOneAndDelete({ _id: notificationId, recipient: student._id });
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid delete request' });
    }
    
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Notification API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
