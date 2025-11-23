import dbConnect from '../../../../lib/dbConnect';
import Opportunity from '../../../../models/Opportunity';

/**
 * Save Opportunity API
 * POST: Save/bookmark an opportunity
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const studentId = req.headers['x-student-id'];
    const portalSecret = req.headers['x-portal-secret'];
    const { oppId } = req.query;

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

    // Check if already saved
    const alreadySaved = opportunity.saves.some(
      id => id.toString() === studentId
    );

    if (alreadySaved) {
      // Unsave
      opportunity.saves = opportunity.saves.filter(
        id => id.toString() !== studentId
      );
      await opportunity.save();
      return res.status(200).json({ message: 'Opportunity unsaved', saved: false });
    } else {
      // Save
      opportunity.saves.push(studentId);
      await opportunity.save();
      return res.status(200).json({ message: 'Opportunity saved', saved: true });
    }

  } catch (error) {
    console.error('Save opportunity error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
