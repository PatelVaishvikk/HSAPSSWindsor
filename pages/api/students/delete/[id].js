import connectDb from '../../../../config/db';
import Student from '../../../../models/Student';
import { requireAdmin } from '../../../../lib/adminRoute.js';

export default async function handler(req, res) {
    const { id } = req.query;
    if (!requireAdmin(req, res)) {
        return;
    }
    await connectDb();

    if (req.method === 'DELETE') {
        try {
            const deletedStudent = await Student.findOneAndDelete({ student_index: id });

            if (!deletedStudent) {
                return res.status(404).json({ error: 'Student not found' });
            }

            res.status(200).json({ message: 'Student deleted successfully', student: deletedStudent });
        } catch (error) {
            console.error('❌ Error deleting student:', error.message);
            res.status(500).json({ error: 'Failed to delete student' });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
}
