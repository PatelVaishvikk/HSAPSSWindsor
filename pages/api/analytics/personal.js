import dbConnect from '../../../lib/dbConnect';
import Student from '../../../models/Student';
import CommunityMessage from '../../../models/CommunityMessage';
import HelpRequest from '../../../models/HelpRequest';
import { calculatePersonalAnalytics, generateWeeklyInsights } from '../../../lib/analytics-engine';

/**
 * Personal Analytics API
 * GET: Fetch comprehensive personal analytics from real data
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const studentId = req.headers['x-student-id'];
    const portalSecret = req.headers['x-portal-secret'];
    const { range = '30d' } = req.query;

    if (!studentId || !portalSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await dbConnect();

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate date range
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch real activities from database
    const [sentMessages, receivedMessages, helpRequests, helpResponses] = await Promise.all([
      // Messages sent by this student
      CommunityMessage.find({
        sender: studentId,
        created_at: { $gte: startDate }
      }).select('created_at recipient').lean(),
      
      // Messages received by this student
      CommunityMessage.find({
        recipient: studentId,
        created_at: { $gte: startDate }
      }).select('created_at sender').lean(),
      
      // Help requests created by this student
      HelpRequest.find({
        student: studentId,
        created_at: { $gte: startDate }
      }).select('created_at title tags status responses').lean(),
      
      // Help requests where this student responded
      HelpRequest.find({
        'responses.responder': studentId,
        created_at: { $gte: startDate }
      }).select('created_at title responses').lean()
    ]);

    // Build activities array from real data
    const activities = [];
    
    // Add message activities
    sentMessages.forEach(msg => {
      activities.push({
        type: 'message',
        timestamp: msg.created_at.toISOString(),
        userId: studentId
      });
    });
    
    receivedMessages.forEach(msg => {
      activities.push({
        type: 'message_received',
        timestamp: msg.created_at.toISOString(),
        userId: studentId
      });
    });

    // Add help request activities
    helpRequests.forEach(req => {
      activities.push({
        type: 'help_request',
        timestamp: req.created_at.toISOString(),
        userId: studentId
      });
      
      // Count responses as networking activities
      req.responses.forEach(resp => {
        activities.push({
          type: 'networking',
          timestamp: resp.created_at.toISOString(),
          userId: studentId
        });
      });
    });

    // Add help response activities
    helpResponses.forEach(req => {
      const userResponses = req.responses.filter(r => r.responder.toString() === studentId);
      userResponses.forEach(resp => {
        activities.push({
          type: 'help_response',
          timestamp: resp.created_at.toISOString(),
          userId: studentId
        });
      });
    });

    // When student updates their profile
    if (student.updated_at && student.updated_at >= startDate) {
      activities.push({
        type: 'profile_update',
        timestamp: student.updated_at.toISOString(),
        userId: studentId
      });
    }

    // Build connections from unique message contacts
    const uniqueContacts = new Set();
    sentMessages.forEach(msg => uniqueContacts.add(msg.recipient.toString()));
    receivedMessages.forEach(msg => uniqueContacts.add(msg.sender.toString()));

    // Fetch connection details
    const connectionIds = Array.from(uniqueContacts);
    const connectionStudents = await Student.find({
      _id: { $in: connectionIds }
    }).select('study_institution study_program created_at').lean();

    const connections = connectionStudents.map(conn => ({
      id: conn._id.toString(),
      connected_at: conn.created_at.toISOString(),
      study_institution: conn.study_institution || 'Unknown',
      study_program: conn.study_program || 'Unknown'
    }));

    // Build content from help requests
    const content = helpRequests.map((req, idx) => ({
      id: req._id.toString(),
      title: req.title,
      created_at: req.created_at.toISOString(),
      likes: 0, // Not tracked yet
      comments: req.responses.length,
      shares: 0, // Not tracked yet
      views: 0, // Not tracked yet
      tags: req.tags || []
    }));

    // Calculate analytics
    const analytics = calculatePersonalAnalytics(
      {
        _id: studentId,
        first_name: student.first_name,
        last_name: student.last_name,
        mail_id: student.mail_id,
        phone: student.phone,
        study_institution: student.study_institution,
        study_program: student.study_program,
        community_headline: student.community_headline,
        community_bio: student.community_bio,
        community_skills: student.community_skills || [],
        community_interests: student.community_interests || [],
        created_at: student.created_at,
        updated_at: student.updated_at,
        last_portal_login_at: student.last_portal_login_at
      },
      activities,
      connections,
      content
    );

    // Calculate gamification based on real activity
    const totalActivities = activities.length;
    const level = Math.min(Math.floor(totalActivities / 10) + 1, 10);
    const experience = totalActivities * 10;
    const nextLevelExp = level * 100;
    
    analytics.gamification = {
      level,
      experience,
      next_level_experience: nextLevelExp,
      title: level >= 8 ? 'Community Leader' : level >= 5 ? 'Active Member' : level >= 3 ? 'Regular' : 'Newcomer',
      total_points: experience
    };

    // Generate insights
    const insights = generateWeeklyInsights(analytics);

    return res.status(200).json({
      analytics,
      insights,
      period: range,
      dataSource: 'real' // Indicate this is real data
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
