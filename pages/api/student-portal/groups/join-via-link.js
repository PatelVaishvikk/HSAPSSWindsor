import connectDb from '../../../../lib/db';
import Group from '../../../../models/Group';
import { getStudentFromRequest } from '../../../../lib/studentPortalUtils';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ message: 'Invite code is required' });
  }

  try {
    await connectDb();
    const student = await getStudentFromRequest(req);
    if (!student) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const group = await Group.findOne({ invite_code: inviteCode });
    if (!group) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    // Check if already a member
    const isMember = group.members.some(memberId => memberId.toString() === student._id.toString());
    if (isMember) {
      return res.status(200).json({ success: true, message: 'Already a member', groupId: group._id });
    }

    // Add to members
    group.members.push(student._id);
    await group.save();

    res.status(200).json({ success: true, message: 'Joined group successfully', groupId: group._id });
  } catch (error) {
    console.error('Error joining group via link:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
