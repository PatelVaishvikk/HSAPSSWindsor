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
          study = '',
          sort = 'recent',
        } = req.query;

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
        const limitParsed = parseInt(limit || '10', 10);
        const limitNum = Number.isNaN(limitParsed) ? 10 : Math.max(limitParsed, 0);
        const skip = limitNum > 0 ? (pageNum - 1) * limitNum : 0;

        const normalizeObjectId = (value) => {
          if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
          return new mongoose.Types.ObjectId(value);
        };

        const emptySummary = {
          statusCounts: {},
          reasonCounts: {},
          studyCounts: {},
          followUps: {
            total: 0,
            overdue: 0,
          },
          lastActivity: null,
        };

        const filter = {};
        let allowedStudentIdsSet = null;

        if (student) {
          const normalizedStudentId = normalizeObjectId(student);
          if (!normalizedStudentId) {
            return res.status(400).json({ error: 'Invalid student id' });
          }
          allowedStudentIdsSet = new Set([normalizedStudentId.toString()]);
        }

        if (study && study.trim()) {
          const trimmedStudy = study.trim();
          const studyQuery =
            trimmedStudy === '__none__'
              ? {
                  $or: [
                    { study: { $exists: false } },
                    { study: '' },
                    { study: null }
                  ]
                }
              : { study: trimmedStudy };
          const studyMatches = await Student.find(studyQuery).select('_id').lean();
          const studyIdStrings = studyMatches.map((s) => s._id.toString());

          if (allowedStudentIdsSet) {
            allowedStudentIdsSet = new Set(
              studyIdStrings.filter((id) => allowedStudentIdsSet.has(id))
            );
          } else {
            allowedStudentIdsSet = new Set(studyIdStrings);
          }

          if (!allowedStudentIdsSet.size) {
            return res.status(200).json({
              callLogs: [],
              total: 0,
              currentPage: pageNum,
              summary: emptySummary,
            });
          }
        }

        if (search && search.trim()) {
          const term = search.trim();
          const regex = new RegExp(term, 'i');
          const matchingStudents = await Student.find({
            $or: [
              { first_name: regex },
              { last_name: regex },
              { mail_id: regex },
              { phone: regex },
              { study: regex }
            ]
          }).select('_id');
          const studentIdsArr = matchingStudents.map((s) => s._id);
          filter.$or = [
            { notes: regex },
            { status: regex }
          ];
          if (studentIdsArr.length > 0) {
            filter.$or.push({ student_id: { $in: studentIdsArr } });
          }
        }

        if (status) {
          if (status.includes(',')) {
            filter.status = { $in: status.split(',') };
          } else {
            filter.status = status;
          }
        }

        if (reason) {
          if (reason.includes(',')) {
            filter.call_reason = { $in: reason.split(',') };
          } else {
            filter.call_reason = reason;
          }
        }

        if (dateFrom || dateTo) {
          filter.timestamp = {};
          if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
          if (dateTo) filter.timestamp.$lte = new Date(dateTo);
        }

        if (recent === '1') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          filter.timestamp = { ...(filter.timestamp || {}), $gte: sevenDaysAgo };
        }

        if (allowedStudentIdsSet && allowedStudentIdsSet.size) {
          const allowedIds = Array.from(allowedStudentIdsSet).map(
            (id) => new mongoose.Types.ObjectId(id)
          );
          filter.student_id =
            allowedIds.length === 1 ? allowedIds[0] : { $in: allowedIds };
        }

        const matchStage = Object.keys(filter).length ? [{ $match: filter }] : [];
        const now = new Date();
        const sortKey = typeof sort === 'string' ? sort.trim().toLowerCase() : 'recent';

        const logsPipeline = [
          ...matchStage,
          {
            $lookup: {
              from: 'students',
              localField: 'student_id',
              foreignField: '_id',
              as: 'studentDoc',
            },
          },
          {
            $unwind: {
              path: '$studentDoc',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              primaryTimestamp: { $ifNull: ['$timestamp', '$createdAt'] },
              studyHasValue: {
                $cond: [
                  { $gt: [{ $strLenCP: { $ifNull: ['$studentDoc.study', ''] } }, 0] },
                  1,
                  0,
                ],
              },
              studySortValue: {
                $cond: [
                  { $gt: [{ $strLenCP: { $ifNull: ['$studentDoc.study', ''] } }, 0] },
                  { $toLower: '$studentDoc.study' },
                  '',
                ],
              },
              studentNameHasValue: {
                $cond: [
                  {
                    $gt: [
                      {
                        $strLenCP: {
                          $trim: {
                            input: {
                              $concat: [
                                { $ifNull: ['$studentDoc.first_name', ''] },
                                ' ',
                                { $ifNull: ['$studentDoc.last_name', ''] },
                              ],
                            },
                          },
                        },
                      },
                      0,
                    ],
                  },
                  1,
                  0,
                ],
              },
              studentNameSortValue: {
                $let: {
                  vars: {
                    fullName: {
                      $trim: {
                        input: {
                          $concat: [
                            { $ifNull: ['$studentDoc.first_name', ''] },
                            ' ',
                            { $ifNull: ['$studentDoc.last_name', ''] },
                          ],
                        },
                      },
                    },
                  },
                  in: {
                    $cond: [
                      { $gt: [{ $strLenCP: '$$fullName' }, 0] },
                      { $toLower: '$$fullName' },
                      '',
                    ],
                  },
                },
              },
            },
          },
        ];

        const sortSpec = (() => {
          switch (sortKey) {
            case 'oldest':
              return { primaryTimestamp: 1, _id: 1 };
            case 'study_asc':
              return {
                studyHasValue: -1,
                studySortValue: 1,
                primaryTimestamp: -1,
                _id: -1,
              };
            case 'study_desc':
              return {
                studyHasValue: -1,
                studySortValue: -1,
                primaryTimestamp: -1,
                _id: -1,
              };
            case 'name_asc':
              return {
                studentNameHasValue: -1,
                studentNameSortValue: 1,
                primaryTimestamp: -1,
                _id: -1,
              };
            case 'name_desc':
              return {
                studentNameHasValue: -1,
                studentNameSortValue: -1,
                primaryTimestamp: -1,
                _id: -1,
              };
            default:
              return { primaryTimestamp: -1, _id: -1 };
          }
        })();

        logsPipeline.push({ $sort: sortSpec });
        if (skip > 0) {
          logsPipeline.push({ $skip: skip });
        }
        if (limitNum > 0) {
          logsPipeline.push({ $limit: limitNum });
        }

        const studySummaryPipeline = [
          ...matchStage,
          {
            $lookup: {
              from: 'students',
              localField: 'student_id',
              foreignField: '_id',
              as: 'studentDoc',
            },
          },
          {
            $unwind: {
              path: '$studentDoc',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: {
                $let: {
                  vars: {
                    rawStudy: { $ifNull: ['$studentDoc.study', ''] },
                  },
                  in: {
                    $cond: [
                      { $gt: [{ $strLenCP: '$$rawStudy' }, 0] },
                      '$$rawStudy',
                      '__none__',
                    ],
                  },
                },
              },
              count: { $sum: 1 },
            },
          },
        ];

        const [
          total,
          logs,
          statusSummary,
          reasonSummary,
          studySummary,
          followUpsTotal,
          overdueFollowUps,
          latestLog,
        ] = await Promise.all([
          CallLog.countDocuments(filter),
          CallLog.aggregate(logsPipeline),
          CallLog.aggregate([
            ...matchStage,
            {
              $group: {
                _id: { $ifNull: ['$status', 'Unknown'] },
                count: { $sum: 1 },
              },
            },
          ]),
          CallLog.aggregate([
            ...matchStage,
            {
              $group: {
                _id: { $ifNull: ['$call_reason', 'General'] },
                count: { $sum: 1 },
              },
            },
          ]),
          CallLog.aggregate(studySummaryPipeline),
          CallLog.countDocuments({ ...filter, needs_follow_up: true }),
          CallLog.countDocuments({
            ...filter,
            needs_follow_up: true,
            follow_up_date: { $ne: null, $lt: now },
          }),
          CallLog.findOne(filter)
            .sort({ timestamp: -1, createdAt: -1 })
            .select('timestamp createdAt')
            .lean(),
        ]);

        const callLogs = logs.map((log) => {
          const studentDoc = log.studentDoc || null;
          const student = studentDoc
            ? {
                ...studentDoc,
                _id: studentDoc._id ? studentDoc._id.toString() : undefined,
              }
            : null;

          const studentId =
            studentDoc && studentDoc._id
              ? studentDoc._id.toString()
              : typeof log.student_id === 'string'
              ? log.student_id
              : log.student_id
              ? log.student_id.toString()
              : null;

          const timestampSource =
            log.primaryTimestamp || log.timestamp || log.createdAt || null;
          const followUpSource = log.follow_up_date || null;

          return {
            _id: log._id.toString(),
            student,
            student_id: studentId,
            status: log.status,
            call_reason: log.call_reason || 'General',
            notes: log.notes,
            needs_follow_up: !!log.needs_follow_up,
            follow_up_date: followUpSource
              ? new Date(followUpSource).toISOString()
              : null,
            date: timestampSource ? new Date(timestampSource).toISOString() : null,
            timestamp: timestampSource
              ? new Date(timestampSource).toISOString()
              : null,
          };
        });

        const statusCounts = statusSummary.reduce((acc, item) => {
          const key = item._id || 'Unknown';
          acc[key] = item.count;
          return acc;
        }, {});

        const reasonCounts = reasonSummary.reduce((acc, item) => {
          const key = item._id || 'General';
          acc[key] = item.count;
          return acc;
        }, {});

        const studyCounts = studySummary.reduce((acc, item) => {
          const key = item._id || '__none__';
          acc[key] = item.count;
          return acc;
        }, {});

        const summary = {
          statusCounts,
          reasonCounts,
          studyCounts,
          followUps: {
            total: followUpsTotal,
            overdue: overdueFollowUps,
          },
          lastActivity: latestLog
            ? (() => {
                const source = latestLog.timestamp || latestLog.createdAt || null;
                return source ? new Date(source).toISOString() : null;
              })()
            : null,
        };

        res
          .status(200)
          .json({ callLogs, total, currentPage: pageNum, summary });
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
        // Ensure the referenced student exists
        const student = await Student.findById(data.student_id);
        if (!student) {
          return res.status(404).json({ error: 'Student not found' });
        }
        // Convert follow_up_date string to Date if provided
        if (data.follow_up_date) {
          data.follow_up_date = new Date(data.follow_up_date);
        }
        // Allow manual timestamp entry
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
