import connectDb from '../../../../../lib/db';
import Group from '../../../../../models/Group';
import Student from '../../../../../models/Student';
import { getStudentFromRequest } from '../../../../../lib/studentPortalUtils';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { emailToAdd } = req.body;

  if (!emailToAdd) {
    return res.status(400).json({ message: 'Student email is required' });
  }

  try {
    await connectDb();
    const requester = await getStudentFromRequest(req);
    if (!requester) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isAdmin = group.admins.some(adminId => adminId.toString() === requester._id.toString());
    
    if (!isAdmin) {
       return res.status(403).json({ message: 'Only admins can add members directly' });
    }

    // Find student by email (mail_id)
    // Use case-insensitive search if needed, but strict for now
    const studentToAdd = await Student.findOne({ mail_id: emailToAdd });
    
    if (!studentToAdd) {
      return res.status(404).json({ message: 'Student with this email not found' });
    }

    // Check if already a member
    const isMember = group.members.some(memberId => memberId.toString() === studentToAdd._id.toString());
    if (isMember) {
      return res.status(400).json({ message: 'Student is already a member' });
    }

    group.members.push(studentToAdd._id);
    await group.save();

    if (global.io) {
      global.io.to(`group:${id}`).emit('group:member_updated');
    }

    res.status(200).json({ success: true, message: 'Member added successfully' });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
