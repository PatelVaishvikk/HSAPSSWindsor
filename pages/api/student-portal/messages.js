import mongoose from 'mongoose';
import connectDb from '../../../lib/db.js';
import CommunityMessage from '../../../models/CommunityMessage.js';
import Student from '../../../models/Student.js';
import { authenticateStudentFromRequest } from '../../../lib/studentPortalAuth.js';

const sanitizeString = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
};

const toObjectId = (value) => {
  try {
    if (!value) {
      return null;
    }
    return new mongoose.Types.ObjectId(value);
  } catch (error) {
    return null;
  }
};

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    await connectDb();
  } catch (error) {
    console.error('Community message DB error:', error);
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const authResult = await authenticateStudentFromRequest(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }
  const { student: viewer } = authResult;
  const viewerId = new mongoose.Types.ObjectId(viewer._id);

  if (req.method === 'POST') {
    const { recipientId, message } = req.body || {};
    const cleanRecipient = sanitizeString(recipientId);
    const cleanMessage = sanitizeString(message);

    if (!cleanRecipient || !cleanMessage) {
      return res.status(400).json({ error: 'Recipient and message are required' });
    }

    const recipientObjectId = toObjectId(cleanRecipient);
    if (!recipientObjectId) {
      return res.status(400).json({ error: 'Invalid recipient' });
    }

    if (recipientObjectId.equals(viewerId)) {
      return res.status(400).json({ error: 'You cannot message yourself' });
    }

    if (cleanMessage.length > 2000) {
      return res.status(400).json({ error: 'Message is too long' });
    }

    const recipient = await Student.findById(recipientObjectId).select(
      'first_name last_name community_visibility available_to_help mail_id phone'
    );
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const newMessage = new CommunityMessage({
      sender: viewerId,
      recipient: recipientObjectId,
      message: cleanMessage
    });

    await newMessage.save();

    const messagePayload = {
      id: newMessage._id.toString(),
      sender: {
        id: viewerId.toString(),
        name: `${viewer.first_name || ''} ${viewer.last_name || ''}`.trim()
      },
      recipient: {
        id: recipientObjectId.toString(),
        name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim()
      },
      body: newMessage.message,
      created_at: newMessage.created_at.toISOString(),
      read: false
    };

    const io = global?.io;
    if (io) {
      io.to(`student:${recipientObjectId.toString()}`).emit('community:message', {
        message: messagePayload
      });
      io.to(`student:${viewerId.toString()}`).emit('community:message:sent', {
        message: messagePayload
      });
    }

    return res.status(201).json({
      message: messagePayload
    });
  }

  const { with: withStudent, scope = 'inbox', limit = '12' } = req.query;
  const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
  const otherId = sanitizeString(withStudent);

  if (otherId) {
    const otherObjectId = toObjectId(otherId);
    if (!otherObjectId) {
      return res.status(400).json({ error: 'Invalid conversation partner' });
    }

    const conversationPartner = await Student.findById(otherObjectId).select(
      'first_name last_name study community_headline community_skills community_interests available_to_help help_offering last_portal_login_at'
    );
    if (!conversationPartner) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const conversation = await CommunityMessage.find({
      $or: [
        { sender: viewerId, recipient: otherObjectId },
        { sender: otherObjectId, recipient: viewerId }
      ]
    })
      .sort({ created_at: 1 })
      .limit(250)
      .populate([
        { path: 'sender', select: 'first_name last_name' },
        { path: 'recipient', select: 'first_name last_name' }
      ])
      .lean({ virtuals: false });

    await CommunityMessage.updateMany(
      {
        sender: otherObjectId,
        recipient: viewerId,
        read_at: null
      },
      { $set: { read_at: new Date() } }
    );

    const formatted = conversation.map((entry) => ({
      id: entry._id.toString(),
      sender: {
        id: entry.sender?._id?.toString() || '',
        name: entry.sender
          ? `${entry.sender.first_name || ''} ${entry.sender.last_name || ''}`.trim()
          : ''
      },
      recipient: {
        id: entry.recipient?._id?.toString() || '',
        name: entry.recipient
          ? `${entry.recipient.first_name || ''} ${entry.recipient.last_name || ''}`.trim()
          : ''
      },
      body: entry.message,
      created_at: entry.created_at ? new Date(entry.created_at).toISOString() : null,
      read: Boolean(entry.read_at)
    }));

    const partnerLastSeen = conversationPartner.last_portal_login_at
      ? conversationPartner.last_portal_login_at.toISOString()
      : null;
    const partnerOnline = conversationPartner.last_portal_login_at
      ? Date.now() - new Date(conversationPartner.last_portal_login_at).getTime() <= 5 * 60 * 1000
      : false;

    return res.status(200).json({
      conversation: formatted,
      partner: {
        id: conversationPartner._id.toString(),
        first_name: conversationPartner.first_name || '',
        last_name: conversationPartner.last_name || '',
        study: conversationPartner.study || '',
        community_headline: conversationPartner.community_headline || '',
        community_skills: conversationPartner.community_skills || [],
        community_interests: conversationPartner.community_interests || [],
        available_to_help: Boolean(conversationPartner.available_to_help),
        help_offering: conversationPartner.help_offering || '',
        last_seen: partnerLastSeen,
        online: partnerOnline
      }
    });
  }

  if (req.method === 'DELETE') {
    const withId = sanitizeString(req.query.with);
    const targetObjectId = toObjectId(withId);
    if (!targetObjectId) {
      return res.status(400).json({ error: 'Invalid conversation partner' });
    }

    await CommunityMessage.deleteMany({
      $or: [
        { sender: viewerId, recipient: targetObjectId },
        { sender: targetObjectId, recipient: viewerId }
      ]
    });

    const io = global?.io;
    if (io) {
      const payload = { type: 'conversation:cleared', studentId: targetObjectId.toString() };
      io.to(`student:${viewerId.toString()}`).emit('community:conversation', payload);
      io.to(`student:${targetObjectId.toString()}`).emit('community:conversation', payload);
    }

    return res.status(204).end();
  }

  const baseMatch = {
    $or: [{ sender: viewerId }, { recipient: viewerId }]
  };

  const threads = await CommunityMessage.aggregate([
    { $match: baseMatch },
    {
      $addFields: {
        other: {
          $cond: [{ $eq: ['$sender', viewerId] }, '$recipient', '$sender']
        },
        isIncoming: { $eq: ['$recipient', viewerId] },
        isUnread: {
          $cond: [
            { $and: [{ $eq: ['$recipient', viewerId] }, { $eq: ['$read_at', null] }] },
            1,
            0
          ]
        }
      }
    },
    { $sort: { created_at: -1 } },
    {
      $group: {
        _id: '$other',
        lastMessage: { $first: '$message' },
        lastTimestamp: { $first: '$created_at' },
        lastSender: { $first: '$sender' },
        unreadCount: { $sum: '$isUnread' }
      }
    },
    { $sort: { lastTimestamp: -1 } },
    { $limit: normalizedLimit },
    {
      $lookup: {
        from: 'students',
        localField: '_id',
        foreignField: '_id',
        as: 'student'
      }
    },
    { $unwind: '$student' },
    {
      $project: {
        _id: 0,
        student_id: '$student._id',
        first_name: '$student.first_name',
        last_name: '$student.last_name',
        study: '$student.study',
        community_headline: '$student.community_headline',
        available_to_help: '$student.available_to_help',
        last_seen: '$student.last_portal_login_at',
        unreadCount: 1,
        lastMessage: 1,
        lastTimestamp: 1,
        lastSender: '$lastSender'
      }
    }
  ]);

  const summary = threads.map((thread) => ({
    student: {
      id: thread.student_id.toString(),
      first_name: thread.first_name || '',
      last_name: thread.last_name || '',
      study: thread.study || '',
      community_headline: thread.community_headline || '',
      available_to_help: Boolean(thread.available_to_help),
      last_seen: thread.last_seen ? new Date(thread.last_seen).toISOString() : null,
      online: thread.last_seen
        ? Date.now() - new Date(thread.last_seen).getTime() <= 5 * 60 * 1000
        : false
    },
    unreadCount: thread.unreadCount || 0,
    lastMessage: thread.lastMessage || '',
    lastTimestamp: thread.lastTimestamp
      ? new Date(thread.lastTimestamp).toISOString()
      : null,
    lastSender: thread.lastSender ? thread.lastSender.toString() : null
  }));

  return res.status(200).json({ inbox: summary });
}
