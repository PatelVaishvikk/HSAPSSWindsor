// pages/api/attendance.js
import connectDb from '../../lib/db';
import Attendance from '../../models/Attendance';
import { requireAdmin } from '../../lib/adminRoute.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }
  await connectDb();
  const { method } = req;

  switch (method) {
    case 'GET': {
      try {
        const { assemblyDate, studentId, page, limit, startDate, endDate } = req.query;
        const { isSuper, mandal } = req.adminRights;

        // Apply Mandal Filtering
        if (!isSuper) {
          if (mandal) {
             const mandalStudents = await Student.find({ mandal_name: mandal }, '_id');
             const mandalStudentIds = mandalStudents.map(s => s._id);
             filter.student = { $in: mandalStudentIds };
          } else {
             // No mandal access -> See nothing
             filter.student = { $in: [] };
          }
        }

        if (assemblyDate) {
          filter.assemblyDate = assemblyDate;
        } else if (startDate && endDate) {
          filter.assemblyDate = { $gte: startDate, $lte: endDate };
        }
        
        if (studentId) {
          // If a specific student is requested, ensure they are in the allowed list (if filtering applies)
          if (filter.student && filter.student.$in) {
            // Already filtered by mandal, just check if this studentId is valid? 
            // Better to intersect the requirements: student MUST be studentId AND in mandal list
            // But complex to do $in intersection in simple query object. 
            // Simpler: Just rely on the existing $in filter if present.
            // If studentId is NOT in the $in list, query returns null, which is correct (access denied/not found).
            // BUT, if we overwrite filter.student = studentId, we lose the mandal check.
            // So we must combine them.
            const allowedIds = filter.student.$in;
            const requestedId = studentId;
            // Check if requested ID is in allowed list
            const isAllowed = allowedIds.some(id => id.toString() === requestedId.toString());
             if (isAllowed) {
                filter.student = requestedId;
             } else {
                // Requested student not in allowed list -> Return empty
                return res.status(200).json({ attendances: [], total: 0, page: pageNum });
             }
          } else {
             // No existing filter (Super Admin), just use studentId
             filter.student = studentId;
          }
        }
        
        const pageNum = parseInt(page || '1', 10);
        const limitNum = parseInt(limit || '10', 10);
        const total = await Attendance.countDocuments(filter);
        
        const attendances = await Attendance.find(filter)
          .populate('student')
          .sort({ assemblyDate: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum === 0 ? undefined : limitNum)
          .lean();

        res.status(200).json({ 
          attendances,
          total, 
          page: pageNum 
        });
      } catch (err) {
        console.error('Error fetching attendance records:', err);
        res.status(500).json({ error: 'Failed to fetch attendance records' });
      }
      break;
    }
    
    case 'POST': {
      try {
        const { isSuper, mandal } = req.adminRights;

        const validateStudentAccess = async (studentId) => {
            if (isSuper) return true;
            if (!mandal) return false;
            const student = await Student.findById(studentId);
            return student && student.mandal_name === mandal;
        };

        // Handle bulk attendance updates
        if (req.body.updates && Array.isArray(req.body.updates)) {
          // Filter out unauthorized updates silently or error? Error is safer.
          for (const update of req.body.updates) {
             const hasAccess = await validateStudentAccess(update.student);
             if (!hasAccess) {
                 return res.status(403).json({ error: `Unauthorized to update attendance for student ${update.student}` });
             }
          }

          const bulkOps = req.body.updates.map(update => ({
            updateOne: {
              filter: {
                student: update.student,
                assemblyDate: update.assemblyDate
              },
              update: { $set: { attended: update.attended } },
              upsert: true
            }
          }));
          
          const result = await Attendance.bulkWrite(bulkOps);
          return res.status(200).json({ success: true, result });
        }
        
        // Handle single attendance creation
        const { student, assemblyDate, attended } = req.body;
        if (!student || !assemblyDate) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!(await validateStudentAccess(student))) {
             return res.status(403).json({ error: 'Unauthorized to mark attendance for this student' });
        }
        
        const newAttendance = new Attendance({
          student,
          assemblyDate,
          attended: attended === true
        });
        
        await newAttendance.save();
        res.status(201).json({ attendance: newAttendance });
      } catch (err) {
        console.error('Error creating attendance record:', err);
        res.status(500).json({ error: 'Failed to create attendance record' });
      }
      break;
    }
    
    case 'PUT': {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Missing attendance record id' });
      }
      
      try {
        const { isSuper, mandal } = req.adminRights;
        // Fetch existing record to check student ownership
        const existingRecord = await Attendance.findById(id).populate('student');
        if (!existingRecord) {
             return res.status(404).json({ error: 'Attendance record not found' });
        }

        if (!isSuper) {
            if (!mandal || existingRecord.student?.mandal_name !== mandal) {
                return res.status(403).json({ error: 'Unauthorized to update this attendance record' });
            }
        }

        const updateFields = { ...req.body };
        // No need to convert assemblyDate, just use string
        const updated = await Attendance.findByIdAndUpdate(
          id, 
          updateFields, 
          { new: true }
        );
        
        res.status(200).json({ attendance: updated });
      } catch (err) {
        console.error('Error updating attendance record:', err);
        res.status(500).json({ error: 'Failed to update attendance record' });
      }
      break;
    }
    
    case 'DELETE': {
      try {
        const { id, studentId, date } = req.query;
        
        // Delete single record by ID
        if (id) {
          const deleted = await Attendance.findByIdAndDelete(id);
          if (!deleted) {
            return res.status(404).json({ error: 'Attendance record not found' });
          }
          return res.status(200).json({ message: 'Attendance record deleted successfully' });
        }
        
        // Delete all records for a specific student on a specific date
        if (studentId && date) {
          const result = await Attendance.deleteMany({
            student: studentId,
            assemblyDate: date
          });
          
          return res.status(200).json({
            message: `Deleted ${result.deletedCount} attendance records`,
            deletedCount: result.deletedCount
          });
        }
        
        // Delete all records for a specific date
        if (date) {
          const result = await Attendance.deleteMany({
            assemblyDate: date
          });
          
          return res.status(200).json({
            message: `Deleted ${result.deletedCount} attendance records for date`,
            deletedCount: result.deletedCount
          });
        }
        
        // Delete all attendance records (use with caution)
        if (Object.keys(req.query).length === 0) {
          const result = await Attendance.deleteMany({});
          return res.status(200).json({
            message: `Deleted all ${result.deletedCount} attendance records`,
            deletedCount: result.deletedCount
          });
        }
        
        return res.status(400).json({ error: 'Missing parameters for deletion' });
      } catch (err) {
        console.error('Error deleting attendance records:', err);
        res.status(500).json({ error: 'Failed to delete attendance records' });
      }
      break;
    }
    
    default: {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ error: `Method ${method} not allowed` });
    }
  }
}
