import { generateConversationStarter } from '../../../lib/ai-engine';
import dbConnect from '../../../lib/dbConnect';
import Student from '../../../models/Student';

/**
 * AI Conversation Starter Generator API
 * POST: Generate personalized conversation starters
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const studentId = req.headers['x-student-id'];
    const portalSecret = req.headers['x-portal-secret'];
    const { targetUserId } = req.body;

    if (!studentId || !portalSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID required' });
    }

    await dbConnect();

    const currentUser = await Student.findById(studentId);
    const targetUser = await Student.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const starter = await generateConversationStarter(
      {
        first_name: currentUser.first_name,
        community_interests: currentUser.community_interests || [],
        study_institution: currentUser.study_institution
      },
      {
        first_name: targetUser.first_name,
        community_interests: targetUser.community_interests || [],
        study_institution: targetUser.study_institution,
        study_program: targetUser.study_program,
        help_offering: targetUser.help_offering
      }
    );

    return res.status(200).json({ starter });

  } catch (error) {
    console.error('Conversation starter API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
