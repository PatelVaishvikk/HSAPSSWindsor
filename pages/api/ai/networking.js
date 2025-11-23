import dbConnect from '../../../lib/dbConnect';
import Student from '../../../models/Student';
import { calculateConnectionScore, generateConversationStarter } from '../../../lib/ai-engine';

/**
 * AI-Powered Networking Recommendations API
 * GET: Get smart connection recommendations
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const studentId = req.headers['x-student-id'];
    const portalSecret = req.headers['x-portal-secret'];

    if (!studentId || !portalSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await dbConnect();

    // Get current user
    const currentUser = await Student.findById(studentId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get potential connections (exclude self and existing connections)
    const potentialConnections = await Student.find({
      _id: { $ne: studentId },
      community_visibility: 'members'
    }).limit(50);

    // Calculate match scores for each potential connection
    const recommendations = [];

    for (const user of potentialConnections) {
      const matchData = calculateConnectionScore(
        {
          community_skills: currentUser.community_skills || [],
          community_interests: currentUser.community_interests || [],
          study_institution: currentUser.study_institution,
          help_offering: currentUser.help_offering
        },
        {
          community_skills: user.community_skills || [],
          community_interests: user.community_interests || [],
          study_institution: user.study_institution,
          help_offering: user.help_offering
        }
      );

      if (matchData.score > 20) { // Only show decent matches
        recommendations.push({
          user: {
            id: user._id.toString(),
            first_name: user.first_name,
            last_name: user.last_name,
            initials: `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`,
            community_headline: user.community_headline,
            community_skills: user.community_skills,
            community_interests: user.community_interests,
            study: user.study,
            study_institution: user.study_institution,
            study_program: user.study_program,
            available_to_help: user.available_to_help,
            help_offering: user.help_offering
          },
          score: matchData.score,
          factors: matchData.factors,
          recommendation: matchData.recommendation
        });
      }
    }

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score);

    // Return top 10 recommendations
    return res.status(200).json({
      recommendations: recommendations.slice(0, 10),
      total: recommendations.length
    });

  } catch (error) {
    console.error('AI Networking API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
