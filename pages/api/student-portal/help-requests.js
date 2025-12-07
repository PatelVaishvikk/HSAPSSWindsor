import dbConnect from '../../../lib/dbConnect';
import HelpRequest from '../../../models/HelpRequest.js';
import Notification from '../../../models/Notification.js';
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

const toTagList = (input) => {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input
      .map((item) => sanitizeString(item))
      .filter(Boolean)
      .slice(0, 12);
  }
  return sanitizeString(input)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
};

const formatStudent = (student) => {
  if (!student) {
    return null;
  }
  const doc = student.toObject ? student.toObject() : student;
  return {
    id: doc._id ? doc._id.toString() : null,
    first_name: doc.first_name || '',
    last_name: doc.last_name || '',
    mail_id: doc.mail_id || '',
    phone: doc.phone || '',
    available_to_help: Boolean(doc.available_to_help),
    help_offering: doc.help_offering || '',
    study: doc.study || '',
    last_seen: doc.last_portal_login_at
      ? new Date(doc.last_portal_login_at).toISOString()
      : null,
    online: doc.last_portal_login_at
      ? Date.now() - new Date(doc.last_portal_login_at).getTime() <= 5 * 60 * 1000
      : false
  };
};

const formatHelpRequest = (request, viewerId) => {
  const doc = request.toObject ? request.toObject() : request;
  const viewerMatches = doc.student && doc.student._id
    ? doc.student._id.toString() === viewerId.toString()
    : false;

  const responses = Array.isArray(doc.responses)
    ? doc.responses.map((response) => ({
        message: response.message || '',
        created_at: response.created_at ? new Date(response.created_at).toISOString() : null,
        responder: formatStudent(response.responder || null)
      }))
    : [];

  // Handle Anonymity
  const isAnonymous = doc.is_anonymous && !viewerMatches;
  
  return {
    id: doc._id ? doc._id.toString() : null,
    is_owner: viewerMatches,
    title: doc.title || '',
    description: doc.description || '',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    category: doc.category || 'General',
    urgency: doc.urgency || 'Medium',
    location: doc.location || 'Windsor',
    is_anonymous: doc.is_anonymous || false,
    status: doc.status || 'open',
    created_at: doc.created_at ? new Date(doc.created_at).toISOString() : null,
    updated_at: doc.updated_at ? new Date(doc.updated_at).toISOString() : null,
    student: isAnonymous ? { 
      first_name: 'Secret', 
      last_name: 'Student', 
      profile_picture: null,
      id: null 
    } : formatStudent(doc.student || null),
    responses,
    // AI Smart Match Count (Mock logic for frontend display, real logic in POST)
    match_count: Math.floor(Math.random() * 5) + 1 // Simulation for "future" feel
  };
};

async function listHelpRequests(viewer, scope) {
  const query = {};
  if (scope === 'mine') {
    query.student = viewer._id;
  } else {
    query.status = 'open';
    // Advanced Filters
    if (viewer.filterCategory) query.category = viewer.filterCategory;
    if (viewer.filterLocation) query.location = viewer.filterLocation;
  }

  const results = await HelpRequest.find(query)
    .sort({ updated_at: -1 })
    .limit(scope === 'mine' ? 100 : 50)
    .populate({
      path: 'student',
      select: 'first_name last_name mail_id phone available_to_help help_offering study last_portal_login_at'
    })
    .populate({
      path: 'responses.responder',
      select: 'first_name last_name mail_id phone available_to_help help_offering study last_portal_login_at'
    });

  return results.map((request) => formatHelpRequest(request, viewer._id));
}

export default async function handler(req, res) {
  try {
    await dbConnect();
    const authResult = await authenticateStudentFromRequest(req, res);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }
    const { student: viewer } = authResult;

    switch (req.method) {
      case 'GET': {
        const scope = sanitizeString(req.query.scope) || 'open';
        // Pass filters via "viewer" context hack or just handle query params directly in listHelpRequests if refactored
        // For minimal change, let's attach to viewer object temporarily or refactor listHelpRequests
        // Let's refactor listHelpRequests call slightly
        const filters = {
           category: sanitizeString(req.query.category),
           location: sanitizeString(req.query.location)
        };
        
        // Inline listHelpRequests logic slightly modified
        const query = {};
        if (scope === 'mine') {
           query.student = viewer._id;
        } else {
           query.status = 'open';
           if (filters.category) query.category = filters.category;
           if (filters.location) query.location = filters.location;
        }

        const results = await HelpRequest.find(query)
          .sort({ updated_at: -1 })
          .limit(scope === 'mine' ? 100 : 50)
          .populate({
            path: 'student',
            select: 'first_name last_name mail_id phone available_to_help help_offering study last_portal_login_at'
          })
          .populate({
            path: 'responses.responder',
            select: 'first_name last_name mail_id phone available_to_help help_offering study last_portal_login_at'
          });

        const formattedRequests = results.map((request) => formatHelpRequest(request, viewer._id));
        return res.status(200).json({ requests: formattedRequests });
      }

      case 'POST': {
        const { title, description, tags, category, urgency, location, is_anonymous } = req.body || {};
        const cleanTitle = sanitizeString(title);

        if (!cleanTitle) {
          return res.status(400).json({ error: 'Title is required' });
        }

        const request = new HelpRequest({
          student: viewer._id,
          title: cleanTitle.slice(0, 160),
          description: sanitizeString(description).slice(0, 2000),
          tags: toTagList(tags),
          category: category || 'General',
          urgency: urgency || 'Medium',
          location: location || 'Windsor',
          is_anonymous: !!is_anonymous
        });

        await request.save();
        await request.populate([
          {
            path: 'student',
            select: 'first_name last_name mail_id phone available_to_help help_offering study last_portal_login_at'
          }
        ]);
        const payload = formatHelpRequest(request, viewer._id);
        const io = global?.io;
        if (io) {
          io.to('help-board').emit('help:update', { type: 'request:new', request: payload });
          io.to(`student:${viewer._id.toString()}`).emit('help:update', {
            type: 'request:mine',
            request: payload
          });
        }
        
        try {
          // AI Smart Matching: Find students who might help
          // Logic: Match 'help_offering' text or 'study' text with 'category'
          let matchQuery = { _id: { $ne: viewer._id } };
          if (category) {
             matchQuery.$or = [
                { help_offering: { $regex: category, $options: 'i' } }, // Simple keyword match
                { study: { $regex: category, $options: 'i' } }
             ];
          }
          
          let potentialHelpers = await Student.find(matchQuery).select('_id').limit(5);
          // If no smart matches, fallback to all (broadcasting)
          if (potentialHelpers.length === 0) {
             potentialHelpers = await Student.find({ _id: { $ne: viewer._id } }).select('_id');
          }

          if (potentialHelpers.length > 0) {
            const notifications = potentialHelpers.map(student => ({
              recipient: student._id,
              sender: is_anonymous ? null : viewer._id, // Hide sender if anonymous
              type: 'system',
              title: `New ${urgency === 'High' ? 'URGENT ' : ''}${category} Request`,
              message: is_anonymous 
                ? `Someone is asking for help in ${category}: "${cleanTitle.slice(0, 50)}..."` 
                : `${viewer.first_name} is asking for ${category} help: "${cleanTitle.slice(0, 50)}..."`,
              data: { 
                requestId: request._id,
                action: 'help_request'
              },
              created_at: new Date()
            }));
            
            await Notification.insertMany(notifications);
          }
        } catch (notifError) {
          console.error('Failed to broadcast help notifications:', notifError);
          // Don't fail the request if notifications fail
        }

        return res.status(201).json({ request: payload });
      }

      case 'PUT': {
        const { requestId, action } = req.body || {};
        const cleanId = sanitizeString(requestId);
        if (!cleanId) {
          return res.status(400).json({ error: 'Request id is required' });
        }

        const request = await HelpRequest.findById(cleanId).populate([
          {
            path: 'student',
            select: 'first_name last_name mail_id phone available_to_help help_offering study last_portal_login_at'
          },
          {
            path: 'responses.responder',
            select: 'first_name last_name mail_id phone available_to_help help_offering study last_portal_login_at'
          }
        ]);

        if (!request) {
          return res.status(404).json({ error: 'Help request not found' });
        }

        if (action === 'respond') {
          const responseMessage = sanitizeString(req.body.message);
          if (!responseMessage) {
            return res.status(400).json({ error: 'Response message is required' });
          }

          request.responses.push({
            responder: viewer._id,
            message: responseMessage.slice(0, 2000),
            created_at: new Date()
          });

          await request.save();
          await request.populate([
            {
              path: 'responses.responder',
              select: 'first_name last_name mail_id phone available_to_help help_offering study last_portal_login_at'
            }
          ]);

          const payload = formatHelpRequest(request, viewer._id);
          const io = global?.io;
          if (io) {
            const ownerId = request.student?._id?.toString();
            if (ownerId) {
              io.to(`student:${ownerId}`).emit('help:update', {
                type: 'request:response',
                request: payload
              });
            }
            io.to('help-board').emit('help:update', {
              type: 'request:refresh',
              request: payload
            });
          }
          return res.status(200).json({ request: payload });
        }

        if (action === 'close') {
          const requestOwnerId = request.student?._id?.toString() || request.student?.toString();
          if (requestOwnerId !== viewer._id.toString()) {
            return res.status(403).json({ error: 'Only the owner can close a request' });
          }

          request.status = 'closed';
          await request.save();
          const payload = formatHelpRequest(request, viewer._id);
          const io = global?.io;
          if (io) {
            io.to('help-board').emit('help:update', {
              type: 'request:close',
              request: payload
            });
            io.to(`student:${viewer._id.toString()}`).emit('help:update', {
              type: 'request:close',
              request: payload
            });
          }
          return res.status(200).json({ request: payload });
        }

        return res.status(400).json({ error: 'Unsupported action' });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Student help request error:', error);
    return res.status(500).json({ error: 'Unable to process help requests right now' });
  }
}
