import connectDb from '../../lib/db';
import CallLog from '../../models/CallLog';
import Student from '../../models/Student';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await connectDb();
  const { method } = req;

  switch (method) {
    case 'GET': {
      try {
        const {
          page,
          limit,
          search,
          studentIds,
          countOnly,
          status = '',
          reason = '',
          student = '',
          dateFrom = '',
          dateTo = '',
          recent = '',
        } = req.query;

        // --- Multi-student counts shortcut ---
        if (studentIds && countOnly === '1') {
          const ids = studentIds.split(',');
          const counts = {};
          const results = await CallLog.aggregate([
            { $match: { student_id: { $in: ids.map(id => mongoose.Types.ObjectId(id)) } } },
            { $group: { _id: '$student_id', count: { $sum: 1 } } }
          ]);
          results.forEach(r => { counts[r._id.toString()] = r.count; });
          ids.forEach(id => { if (!counts[id]) counts[id] = 0; });
          return res.status(200).json({ counts });
        }

        const pageNum = parseInt(page || '1', 10);
        const limitNum = parseInt(limit || '10', 10);
        const skip = (pageNum - 1) * limitNum;

        // --- FILTER BUILDING ---
        let filter = {};

        // 1. SEARCH LOGIC
        if (search && search.trim()) {
          const term = search.trim();
          const regex = new RegExp(term, 'i');
          const matchingStudents = await Student.find({
            $or: [
              { first_name: regex },
              { last_name: regex },
              { mail_id: regex },
              { phone: regex }
            ]
          }).select('_id');
          const studentIdsArr = matchingStudents.map(s => s._id);
          filter.$or = [
            { notes: regex },
            { status: regex }
          ];
          if (studentIdsArr.length > 0) {
            filter.$or.push({ student_id: { $in: studentIdsArr } });
          }
        }

        // 2. STATUS filter
        if (status) {
          if (status.includes(',')) {
            filter.status = { $in: status.split(',') };
          } else {
            filter.status = status;
          }
        }

        // 3. REASON filter (key fix)
        if (reason) {
          if (reason.includes(',')) {
            filter.call_reason = { $in: reason.split(',') };
          } else {
            filter.call_reason = reason;
          }
        }

        // 4. STUDENT filter
        if (student) {
          filter.student_id = student;
        }

        // 5. DATE RANGE filter (on timestamp)
        if (dateFrom || dateTo) {
          filter.timestamp = {};
          if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
          if (dateTo) filter.timestamp.$lte = new Date(dateTo);
        }

        // 6. RECENT ONLY (last 7 days)
        if (recent === '1') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          filter.timestamp = { ...(filter.timestamp || {}), $gte: sevenDaysAgo };
        }

        // --- COUNT FOR PAGINATION ---
        const total = await CallLog.countDocuments(filter);

        // --- FETCH LOGS + POPULATE STUDENT INFO ---
        const logsQuery = CallLog.find(filter)
          .populate('student_id')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limitNum);

        const logs = await logsQuery.lean();

        const callLogs = logs.map(log => {
          const studentInfo = log.student_id || null;
          if (studentInfo && studentInfo._id) {
            studentInfo._id = studentInfo._id.toString();
          }
          return {
            _id: log._id.toString(),
            student: studentInfo ? { ...studentInfo } : null,
            status: log.status,
            call_reason: log.call_reason || 'General',
            notes: log.notes,
            needs_follow_up: log.needs_follow_up,
            follow_up_date: log.follow_up_date ? new Date(log.follow_up_date).toISOString() : null,
            date: log.timestamp ? new Date(log.timestamp).toISOString() : null,
            timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : null,
          };
        });

        res.status(200).json({ callLogs, total, currentPage: pageNum });
      } catch (err) {
        console.error('Error fetching call logs:', err);
        res.status(500).json({ error: 'Failed to fetch call logs' });
      }
      break;
    }

    case 'POST': {
      try {
        const data = req.body;
        if (!data.student_id) {
          return res.status(400).json({ error: 'Student ID is required' });
        }
        const student = await Student.findById(data.student_id);
        if (!student) {
          return res.status(404).json({ error: 'Student not found' });
        }
        if (data.follow_up_date) {
          data.follow_up_date = new Date(data.follow_up_date);
        }
        let timestamp = Date.now();
        if (data.timestamp) {
          const parsedTimestamp = new Date(data.timestamp);
          if (!isNaN(parsedTimestamp.getTime())) {
            timestamp = parsedTimestamp;
          }
        }
        const newCallLog = new CallLog({
          student_id: data.student_id,
          status: data.status || 'Completed',
          call_reason: data.call_reason || 'General',
          notes: data.notes || '',
          needs_follow_up: !!data.needs_follow_up,
          follow_up_date: data.follow_up_date || (data.needs_follow_up ? undefined : null),
          timestamp
        });
        await newCallLog.save();
        const callLogObj = newCallLog.toObject();
        callLogObj._id = callLogObj._id.toString();
        res.status(201).json({ callLog: callLogObj });
      } catch (err) {
        console.error('Error saving call log:', err);
        if (err.name === 'ValidationError') {
          const messages = Object.values(err.errors).map(e => e.message);
          return res.status(400).json({ error: messages.join('; ') });
        }
        res.status(500).json({ error: 'Failed to save call log' });
      }
      break;
    }

    case 'DELETE': {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Missing call log id' });
      }
      try {
        const deletedLog = await CallLog.findByIdAndDelete(id);
        if (!deletedLog) {
          return res.status(404).json({ error: 'Call log not found' });
        }
        res.status(200).json({ message: 'Call log deleted successfully' });
      } catch (err) {
        console.error('Error deleting call log:', err);
        res.status(500).json({ error: 'Failed to delete call log' });
      }
      break;
    }

    default: {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).json({ error: `Method ${method} not allowed` });
    }
  }
}
