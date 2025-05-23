// File: pages/api/call-logs/index.js

import connectDb from '../../../config/db';
import CallLog from '../../../models/CallLog';
import Student from '../../../models/Student';
import mongoose from 'mongoose';

export default async function handler(req, res) {
    // Ensure DB connection
    try {
        await connectDb();
    } catch (error) {
        console.error('!!! Database Connection Error:', error);
        return res.status(503).json({ error: 'Database connection failed', details: error.message });
    }

    if (req.method === 'GET') {
        console.log('\n--- [API GET /api/call-logs] ---');
        console.log('Request Query Parameters:', req.query);

        // Get all filter params
        const {
            page = 1,
            limit = 10,
            search = '',
            status = '',
            reason = '',
            student = '',
            dateFrom = '',
            dateTo = '',
            recent = ''
        } = req.query;

        const pageNumber = parseInt(page, 10);
        let limitNumber = parseInt(limit, 10);

        // Cap the limit to a reasonable maximum (e.g., 100)
        const MAX_LIMIT = 100;
        if (limitNumber > MAX_LIMIT) limitNumber = MAX_LIMIT;
        if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
            return res.status(400).json({ error: 'Invalid page or limit parameters. Page and limit must be positive integers.' });
        }
        const skip = (pageNumber - 1) * limitNumber;

        try {
            // --- Build Filter Object ---
            let filter = {};
            const trimmedSearch = search.trim();

            // 1. Search filter
            if (trimmedSearch) {
                const regex = new RegExp(trimmedSearch, 'i');
                const matchingStudents = await Student.find({
                    $or: [
                        { first_name: regex },
                        { last_name: regex },
                        { mail_id: regex },
                        { phone: regex }
                    ]
                }).select('_id').lean();
                const studentIds = matchingStudents.map(student => student._id);

                filter.$or = [
                    { notes: regex },
                    { status: regex }
                ];
                if (studentIds.length > 0) {
                    filter.$or.push({ student_id: { $in: studentIds } });
                }
            }

            // 2. Status filter (can handle comma-separated for multi-select)
            if (status) {
                if (status.includes(',')) {
                    filter.status = { $in: status.split(',') };
                } else {
                    filter.status = status;
                }
            }

            // 3. Reason filter (can handle comma-separated for multi-select)
            if (reason) {
                if (reason.includes(',')) {
                    filter.call_reason = { $in: reason.split(',') };
                } else {
                    filter.call_reason = reason;
                }
            }

            // 4. Student filter
            if (student) {
                filter.student_id = student;
            }

            // 5. Date filter
            if (dateFrom || dateTo) {
                filter.createdAt = {};
                if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
                if (dateTo) filter.createdAt.$lte = new Date(dateTo);
            }

            // 6. Recent filter (if you want logs only from last 7 days, for example)
            if (recent === '1') {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                filter.createdAt = { ...(filter.createdAt || {}), $gte: sevenDaysAgo };
            }

            // --- Query & Pagination ---
            const sortField = 'createdAt';
            const total = await CallLog.countDocuments(filter);

            let callLogs = [];
            if (total > 0 && skip < total) {
                callLogs = await CallLog.find(filter)
                    .populate({
                        path: 'student_id',
                        select: 'first_name last_name mail_id phone',
                        model: Student
                    })
                    .sort({ [sortField]: -1 })
                    .skip(skip)
                    .limit(limitNumber)
                    .lean();
            }

            const processedLogs = callLogs.map(log => ({
                ...log,
                _id: log._id.toString(),
                student_id: log.student_id ? { ...log.student_id, _id: log.student_id._id.toString() } : null,
                date: log[sortField] ? new Date(log[sortField]).toISOString() : null,
                follow_up_date: log.follow_up_date ? new Date(log.follow_up_date).toISOString() : null,
            }));

            res.status(200).json({
                callLogs: processedLogs,
                total,
                currentPage: pageNumber,
                totalPages: Math.ceil(total / limitNumber),
            });

        } catch (error) {
            console.error('!!! Error during GET /api/call-logs:', error);
            res.status(500).json({ error: 'Server error while fetching call logs', details: error.message });
        }

    } else if (req.method === 'POST') {
        // ... (unchanged POST handler)
        const { student_id, status, notes, needs_follow_up, follow_up_date, call_reason, timestamp } = req.body;

        if (!student_id) {
            return res.status(400).json({
                error: 'Missing required field',
                details: 'Student ID is required.',
            });
        }

        try {
            const studentExists = await Student.findById(student_id).lean();
            if (!studentExists) {
                return res.status(404).json({ error: 'Student not found', details: `No student found with ID ${student_id}` });
            }
        } catch (error) {
            if (error.name === 'CastError') {
                return res.status(400).json({ error: 'Invalid Student ID format' });
            }
            return res.status(500).json({ error: 'Server error checking student', details: error.message });
        }

        if (needs_follow_up && !follow_up_date) {
            return res.status(400).json({
                error: 'Missing follow-up date',
                details: 'Follow-up date is required when "Needs Follow-up" is checked.',
            });
        }

        try {
            const newCallLogData = {
                student_id,
                status: status || 'Completed',
                notes: notes || '',
                needs_follow_up: !!needs_follow_up,
                call_reason: call_reason || 'General',
                timestamp: timestamp ? new Date(timestamp) : undefined,
                ...(!!needs_follow_up && follow_up_date && { follow_up_date: new Date(follow_up_date) }),
            };

            const newCallLog = new CallLog(newCallLogData);
            const savedCallLog = await newCallLog.save();

            const populatedLog = await CallLog.findById(savedCallLog._id)
                .populate({
                    path: 'student_id',
                    select: 'first_name last_name mail_id phone',
                    model: Student
                })
                .lean();

            const responseLog = {
                ...populatedLog,
                _id: populatedLog._id.toString(),
                student_id: populatedLog.student_id ? { ...populatedLog.student_id, _id: populatedLog.student_id._id.toString() } : null,
                date: populatedLog.createdAt ? new Date(populatedLog.createdAt).toISOString() : null,
                follow_up_date: populatedLog.follow_up_date ? new Date(populatedLog.follow_up_date).toISOString() : null,
            };

            res.status(201).json({
                message: 'Call log created successfully',
                callLog: responseLog,
            });
        } catch (error) {
            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map(e => e.message);
                return res.status(400).json({ error: 'Validation Error', details: messages.join('; ') });
            }
            res.status(500).json({
                error: 'Server error while saving call log',
                details: error.message,
            });
        }

    } else if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ error: 'Missing call log ID in request query' });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid Call Log ID format' });
        }

        try {
            const deletedCallLog = await CallLog.findByIdAndDelete(id);
            if (!deletedCallLog) {
                return res.status(404).json({ error: 'Call log not found with the provided ID' });
            }
            res.status(200).json({ message: 'Call log deleted successfully', deletedId: id });
        } catch (error) {
            res.status(500).json({ error: 'Server error while deleting call log', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}
