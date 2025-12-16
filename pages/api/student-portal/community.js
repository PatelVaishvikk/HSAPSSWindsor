import connectDb from '../../../lib/db.js';
import Student from '../../../models/Student.js';
import { authenticateStudentFromRequest } from '../../../lib/studentPortalAuth.js';

const normalizeSearchTerm = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const communitySearchConditions = (term) => {
  if (!term) {
    return null;
  }
  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return {
    $or: [
      { first_name: regex },
      { last_name: regex },
      { community_headline: regex },
      { community_bio: regex },
      { community_skills: regex },
      { study: regex },
      { post_graduation_plan: regex }
    ]
  };
};

const toProfilePayload = (student, viewerId) => {
  const isSelf = student._id.toString() === viewerId.toString();
  const skills = Array.isArray(student.community_skills)
    ? student.community_skills
    : [];
  const interests = Array.isArray(student.community_interests)
    ? student.community_interests
    : [];

  const lastSeen = student.last_portal_login_at
    ? student.last_portal_login_at.toISOString()
    : null;
  const online = student.last_portal_login_at
    ? Date.now() - new Date(student.last_portal_login_at).getTime() <= 5 * 60 * 1000
    : false;

  const contactAllowed = Boolean(student.available_to_help);

  return {
    id: student._id.toString(),
    is_self: isSelf,
    first_name: student.first_name,
    last_name: student.last_name,
    community_headline: student.community_headline || '',
    community_bio: student.community_bio || '',
    community_skills: skills,
    community_interests: interests,
    available_to_help: contactAllowed,
    help_offering: student.help_offering || '',
    linkedin_url: student.linkedin_url || '',
    portfolio_url: student.portfolio_url || '',
    study: student.study || '',
    post_graduation_plan: student.post_graduation_plan || '',
    mail_id: contactAllowed ? student.mail_id || '' : '',
    phone: contactAllowed ? student.phone || '' : '',
    last_seen: lastSeen,
    online,
    updated_at: student.updated_at ? student.updated_at.toISOString() : null,
    last_portal_update_at: student.last_portal_update_at
      ? student.last_portal_update_at.toISOString()
      : null,
    has_requested_follow: Array.isArray(student.followRequests)
      ? student.followRequests.some(id => id.toString() === viewerId.toString())
      : false,
    mandal_name: student.mandal_name || '',
    mukt_type: student.mukt_type || ''
  };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    await connectDb();

    const authResult = await authenticateStudentFromRequest(req, res);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }

    const { student: viewer } = authResult;
    const searchTerm = normalizeSearchTerm(req.query.search);

    const baseFilter = {
      $or: [
        { community_visibility: { $ne: 'hidden' } },
        { _id: viewer._id }
      ]
    };

    const conditions = [baseFilter];
    const { scope = 'all' } = req.query;

    console.log('[API DEBUG] Community fetch. Scope:', scope, 'Viewer Mandal:', viewer.mandal_name);
    
    if (scope === 'my_mandal') {
        if (viewer.mandal_name) {
            const isWindsor = /^windsor$/i.test(viewer.mandal_name);
            if (isWindsor) {
                 // Windsor includes explicit Windsor OR empty/null (default)
                 conditions.push({ 
                     $or: [
                         { mandal_name: { $regex: new RegExp(`^${viewer.mandal_name}$`, 'i') } },
                         { mandal_name: { $exists: false } }, 
                         { mandal_name: '' },
                         { mandal_name: null }
                     ]
                 });
            } else {
                 conditions.push({ mandal_name: { $regex: new RegExp(`^${viewer.mandal_name}$`, 'i') } });
            }
        } else {
             // If user has no mandal, 'my_mandal' returns nothing
             conditions.push({ mandal_name: '__RESTRICTED__' });
        }
    } else if (scope === 'other_mandals') {
        if (viewer.mandal_name) {
            const isWindsor = /^windsor$/i.test(viewer.mandal_name);
            if (isWindsor) {
                 // Other means NOT Windsor AND NOT Empty
                 conditions.push({ 
                     $and: [
                         { mandal_name: { $not: { $regex: new RegExp(`^${viewer.mandal_name}$`, 'i') } } },
                         { mandal_name: { $ne: '' } },
                         { mandal_name: { $ne: null } }
                     ] 
                 });
            } else {
                 conditions.push({ mandal_name: { $not: { $regex: new RegExp(`^${viewer.mandal_name}$`, 'i') } } });
            }
        }
        // If user has no mandal, 'other' is everyone else (which is everyone), so no filter needed
    }

    const searchFilter = communitySearchConditions(searchTerm);
    if (searchFilter) {
      conditions.push(searchFilter);
    }

    const query =
      conditions.length === 1 ? conditions[0] : { $and: conditions };

    const communityMembers = await Student.find(query)
      .sort({ available_to_help: -1, updated_at: -1 })
      .select(
        'first_name last_name study post_graduation_plan community_headline community_bio community_skills community_interests available_to_help help_offering linkedin_url portfolio_url mail_id phone updated_at last_portal_update_at last_portal_login_at followRequests mandal_name mukt_type'
      )
      .lean();

    const profiles = communityMembers.map((member) =>
      toProfilePayload(member, viewer._id)
    );

    const viewerPayload = toProfilePayload(viewer.toObject ? viewer.toObject() : viewer, viewer._id);

    return res.status(200).json({
      profiles,
      viewer: viewerPayload
    });
  } catch (error) {
    console.error('Student community fetch error:', error);
    return res.status(500).json({ error: 'Unable to load community right now' });
  }
}
