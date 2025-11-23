import connectDb from '../../../lib/db.js';
import HelpRequest from '../../../models/HelpRequest.js';
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

  return {
    id: doc._id ? doc._id.toString() : null,
    is_owner: viewerMatches,
    title: doc.title || '',
    description: doc.description || '',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    status: doc.status || 'open',
    created_at: doc.created_at ? new Date(doc.created_at).toISOString() : null,
    updated_at: doc.updated_at ? new Date(doc.updated_at).toISOString() : null,
    student: formatStudent(doc.student || null),
    responses
  };
};

async function listHelpRequests(viewer, scope) {
  const query = {};
  if (scope === 'mine') {
    query.student = viewer._id;
  } else {
    query.status = 'open';
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
    await connectDb();
    const authResult = await authenticateStudentFromRequest(req, res);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }
    const { student: viewer } = authResult;

    switch (req.method) {
      case 'GET': {
        const scope = sanitizeString(req.query.scope) || 'open';
        const requests = await listHelpRequests(viewer, scope);
        return res.status(200).json({ requests });
      }

      case 'POST': {
        const { title, description, tags } = req.body || {};
        const cleanTitle = sanitizeString(title);

        if (!cleanTitle) {
          return res.status(400).json({ error: 'Title is required' });
        }

        const request = new HelpRequest({
          student: viewer._id,
          title: cleanTitle.slice(0, 160),
          description: sanitizeString(description).slice(0, 2000),
          tags: toTagList(tags)
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
