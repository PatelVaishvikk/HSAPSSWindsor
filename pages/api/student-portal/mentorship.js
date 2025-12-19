import connectDb from '../../../lib/db.js';
import Student from '../../../models/Student.js';
import Mentorship from '../../../models/Mentorship.js';
import { authenticateStudentFromRequest } from '../../../lib/studentPortalAuth.js';

export default async function handler(req, res) {
  await connectDb();
  const authResult = await authenticateStudentFromRequest(req, res);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  const { student: viewer } = authResult;
  const viewerId = viewer._id.toString();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, viewer);
    case 'POST':
      return handlePost(req, res, viewer);
    case 'PUT':
      return handlePut(req, res, viewer);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

async function handleGet(req, res, viewer) {
  try {
    const { action = 'discover' } = req.query;

    if (action === 'my_mentorships') {
      const mentorships = await Mentorship.find({
        $or: [{ mentor: viewer._id }, { mentee: viewer._id }]
      })
      .populate('mentor', 'first_name last_name community_headline profile_picture study_institution study_program')
      .populate('mentee', 'first_name last_name community_headline profile_picture study_institution study_program')
      .sort({ updated_at: -1 });

      return res.status(200).json({ mentorships });
    }

    // Discover Mode: Recommend Mentors
    const { mandal, mukt_type, search } = req.query;

    // Criteria for potential mentors:
    // 1. Available to help
    // 2. Not the viewer
    // 3. Not already in a pending/active mentorship with viewer
    const existingMentorships = await Mentorship.find({
      $or: [{ mentor: viewer._id }, { mentee: viewer._id }],
      status: { $in: ['pending', 'active'] }
    }).lean();

    const excludedIds = existingMentorships.map(m => 
      m.mentor.toString() === viewer._id.toString() ? m.mentee.toString() : m.mentor.toString()
    );
    excludedIds.push(viewer._id.toString());

    const query = {
      _id: { $nin: excludedIds },
      available_to_help: true,
      community_visibility: { $ne: 'hidden' }
    };

    if (mandal && mandal !== 'all') {
      query.mandal_name = mandal;
    }
    if (mukt_type && mukt_type !== 'all') {
      query.mukt_type = mukt_type;
    }
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { first_name: searchRegex },
        { last_name: searchRegex },
        { community_headline: searchRegex },
        { employment_role: searchRegex }
      ];
    }

    const potentialMentors = await Student.find(query).lean();

    // Helper for industry matching
    const extractKeywords = (str = '') => {
      return str.toLowerCase().split(/[^a-z0-9]/).filter(w => w.length > 2); // Filter very short words
    };

    const TECH_KEYWORDS = ['ai', 'dl', 'ml', 'software', 'computing', 'code', 'developer', 'it', 'data', 'tech', 'programming', 'app', 'web', 'cloud', 'security'];
    const NOISE_KEYWORDS = ['engineer', 'engineering', 'student', 'aspiring', 'junior', 'senior', 'meng', 'btech', 'university', 'college', 'windsor', 'uwindsor', 'member', 'degree', 'program', 'school'];

    const viewerKeywords = [
      ...extractKeywords(viewer.study_program),
      ...extractKeywords(viewer.employment_role),
      ...extractKeywords(viewer.community_headline),
      ...(viewer.community_skills || []).map(s => s.toLowerCase())
    ].filter(kw => !NOISE_KEYWORDS.includes(kw));

    const isViewerTech = viewerKeywords.some(kw => TECH_KEYWORDS.includes(kw));

    // Matching Algorithm
    const recommended = potentialMentors.map(mentor => {
      let score = 0;
      const reasons = [];

      const mentorKeywords = [
        ...extractKeywords(mentor.study_program),
        ...extractKeywords(mentor.employment_role),
        ...extractKeywords(mentor.community_headline),
        ...(mentor.community_skills || []).map(s => s.toLowerCase())
      ].filter(kw => !NOISE_KEYWORDS.includes(kw));
      
      const isMentorTech = mentorKeywords.some(kw => TECH_KEYWORDS.includes(kw));

      // 1. Professional Status (+150) - Dominant Factor
      const isJobHolder = mentor.employment_status?.toLowerCase().includes('work') || 
                          mentor.employment_status?.toLowerCase().includes('employ');
      if (isJobHolder) {
        score += 150;
        reasons.push('Established Professional');
      } 

      // 2. Tech Industry Alignment (+60)
      if (isViewerTech && isMentorTech) {
        score += 60;
        reasons.push('Tech Industry Alignment');
      }

      // 3. Direct Field Overlap (+40) - Direct keyword match (filtered for noise)
      const hasDirectOverlap = mentorKeywords.some(kw => viewerKeywords.includes(kw) && !TECH_KEYWORDS.includes(kw));
      if (hasDirectOverlap) {
        score += 40;
        reasons.push('Direct Role/Field Match');
      }

      // 4. Seniority / Alumni (+10) 
      if (mentor.graduation_completed && !isJobHolder) {
        score += 10;
        reasons.push('Graduated Alumni');
      }

      // 5. Institution Match (+10)
      if (mentor.study_institution && viewer.study_institution && 
          mentor.study_institution.toLowerCase() === viewer.study_institution.toLowerCase()) {
        score += 10;
        reasons.push('Shared Institution');
      }

      // 6. Degree Program Overlap (+10)
      if (mentor.study_program && viewer.study_program && 
          mentor.study_program.toLowerCase() === viewer.study_program.toLowerCase()) {
        score += 10;
        reasons.push('Same Degree Program');
      }

      // Normalize score to 100 max for display
      const displayScore = Math.min(Math.round((score / 200) * 100), 100);

      return {
        ...mentor,
        id: mentor._id.toString(),
        matchScore: displayScore, // Normalized
        matchReasons: reasons
      };
    })
    .filter(m => {
      // Must have either a Tech match OR be a Job Holder
      const isJobHolder = m.employment_status?.toLowerCase().includes('work') || 
                          m.employment_status?.toLowerCase().includes('employ');
      const hasIndustryValue = m.matchReasons.includes('Tech Industry Alignment') || 
                               m.matchReasons.includes('Direct Role/Field Match');
      return isJobHolder || hasIndustryValue;
    });

    // Sort by score descending
    recommended.sort((a, b) => b.matchScore - a.matchScore);

    return res.status(200).json({ 
      recommended: recommended.slice(0, 30) 
    });

  } catch (error) {
    console.error('Mentorship GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch mentorship data' });
  }
}

async function handlePost(req, res, viewer) {
  try {
    const { mentorId, category, message, goals } = req.body;

    if (!mentorId) return res.status(400).json({ error: 'Mentor ID is required' });

    // Check if mentor exists and is available
    const mentor = await Student.findById(mentorId);
    if (!mentor || !mentor.available_to_help) {
      return res.status(404).json({ error: 'Mentor not found or not available' });
    }

    // Check for existing mentorship
    const existing = await Mentorship.findOne({
      mentor: mentorId,
      mentee: viewer._id,
      status: { $in: ['pending', 'active'] }
    });

    if (existing) {
      return res.status(400).json({ error: 'A mentorship request is already pending or active' });
    }

    const mentorship = await Mentorship.create({
      mentor: mentorId,
      mentee: viewer._id,
      category,
      message,
      goals: Array.isArray(goals) ? goals : [],
      status: 'pending'
    });

    return res.status(201).json({ mentorship });
  } catch (error) {
    console.error('Mentorship POST error:', error);
    return res.status(500).json({ error: 'Failed to create mentorship request' });
  }
}

async function handlePut(req, res, viewer) {
  try {
    const { mentorshipId, status, notes } = req.body;

    const mentorship = await Mentorship.findById(mentorshipId);
    if (!mentorship) return res.status(404).json({ error: 'Mentorship not found' });

    const isMentor = mentorship.mentor.toString() === viewer._id.toString();
    const isMentee = mentorship.mentee.toString() === viewer._id.toString();

    if (!isMentor && !isMentee) {
      return res.status(403).json({ error: 'Unauthorized to update this mentorship' });
    }

    // Status transition logic
    if (status === 'active' && !isMentor) {
      return res.status(403).json({ error: 'Only mentors can accept a request' });
    }

    if (status) mentorship.status = status;
    if (notes !== undefined) mentorship.notes = notes;

    await mentorship.save();

    return res.status(200).json({ mentorship });
  } catch (error) {
    console.error('Mentorship PUT error:', error);
    return res.status(500).json({ error: 'Failed to update mentorship' });
  }
}
