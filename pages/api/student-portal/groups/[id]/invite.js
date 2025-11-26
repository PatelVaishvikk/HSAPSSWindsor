import connectDb from '../../../../../lib/db';
import Group from '../../../../../models/Group';
import { getStudentFromRequest } from '../../../../../lib/studentPortalUtils';
import { nanoid } from 'nanoid';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDb();
    const student = await getStudentFromRequest(req);
    if (!student) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only admins can reset the code
    const isAdmin = group.admins.some(adminId => adminId.toString() === student._id.toString());
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can manage invite codes' });
    }

    // Generate a new 8-character code
    const newCode = nanoid(8);
    group.invite_code = newCode;
    await group.save();

    res.status(200).json({ success: true, invite_code: newCode });
  } catch (error) {
    console.error('Error generating invite code:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
