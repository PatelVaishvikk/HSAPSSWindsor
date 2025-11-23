import dbConnect from '../../../lib/dbConnect';
import Opportunity from '../../../models/Opportunity';
import Student from '../../../models/Student';

/**
 * Opportunities API
 * GET: List opportunities with filtering
 * POST: Create new opportunity
 */
export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req, res) {
  try {
    const studentId = req.headers['x-student-id'];
    const { type, search, status = 'open', limit = 20 } = req.query;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const query = { status };

    if (type && type !== 'all') {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { required_skills: { $in: [new RegExp(search, 'i')] } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const opportunities = await Opportunity.find(query)
      .sort({ featured: -1, created_at: -1 })
      .limit(parseInt(limit))
      .populate('posted_by', 'first_name last_name community_headline')
      .lean();

    // Add computed fields
    const enrichedOpportunities = opportunities.map(opp => ({
      ...opp,
      id: opp._id.toString(),
      application_count: opp.applications?.length || 0,
      save_count: opp.saves?.length || 0
    }));

    return res.status(200).json({
      opportunities: enrichedOpportunities,
      total: enrichedOpportunities.length
    });

  } catch (error) {
    console.error('Get opportunities error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePost(req, res) {
  try {
    const studentId = req.headers['x-student-id'];
    const portalSecret = req.headers['x-portal-secret'];

    if (!studentId || !portalSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      title,
      description,
      type,
      location,
      remote,
      compensation,
      required_skills,
      preferred_skills,
      experience_level,
      commitment,
      duration,
      start_date,
      application_deadline,
      application_url,
      contact_email,
      company,
      tags
    } = req.body;

    if (!title || !description || !type) {
      return res.status(400).json({ error: 'Title, description, and type are required' });
    }

    const opportunity = new Opportunity({
      title,
      description,
      type,
      posted_by: studentId,
      location,
      remote: remote || false,
      compensation,
      required_skills: required_skills || [],
      preferred_skills: preferred_skills || [],
      experience_level: experience_level || 'any',
      commitment: commitment || 'full_time',
      duration,
      start_date,
      application_deadline,
      application_url,
      contact_email,
      company,
      tags: tags || [],
      status: 'open'
    });

    await opportunity.save();

    return res.status(201).json({
      message: 'Opportunity created successfully',
      opportunity: {
        ...opportunity.toObject(),
        id: opportunity._id.toString()
      }
    });

  } catch (error) {
    console.error('Create opportunity error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
