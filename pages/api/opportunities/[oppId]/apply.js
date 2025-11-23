import dbConnect from '../../../../lib/mongodb';
import Opportunity from '../../../../models/Opportunity';

/**
 * Opportunity Application API
 * POST: Apply to an opportunity
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const studentId = req.headers['x-student-id'];
    const portalSecret = req.headers['x-portal-secret'];
    const { oppId } = req.query;
    const { message, resume_url, portfolio_url } = req.body;

    if (!studentId || !portalSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!oppId) {
      return res.status(400).json({ error: 'Opportunity ID required' });
    }

    await dbConnect();

    const opportunity = await Opportunity.findById(oppId);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    if (opportunity.status !== 'open') {
      return res.status(400).json({ error: 'This opportunity is no longer accepting applications' });
    }

    // Check if already applied
    const existingApplication = opportunity.applications.find(
      app => app.applicant.toString() === studentId
    );

    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied to this opportunity' });
    }

    // Add application
    opportunity.applications.push({
      applicant: studentId,
      message,
      resume_url,
      portfolio_url,
      status: 'pending',
      applied_at: new Date()
    });

    await opportunity.save();

    return res.status(200).json({
      message: 'Application submitted successfully',
      application: opportunity.applications[opportunity.applications.length - 1]
    });

  } catch (error) {
    console.error('Apply to opportunity error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
