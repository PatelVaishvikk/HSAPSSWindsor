import connectDb from '../../lib/db';
import Student from '../../models/Student';
import CallLog from '../../models/CallLog';
import { requireAdmin } from '../../lib/adminRoute.js';

const INSTITUTION_LABELS = {
    uwindsor: 'University of Windsor',
    st_clair: 'St. Clair College',
    other: 'Other'
};

const POST_GRAD_PLAN_LABELS = {
    working: 'Working',
    job_search: 'Job Searching',
    higher_studies: 'Higher Studies',
    entrepreneur: 'Entrepreneurship',
    other: 'Other'
};

const EMPLOYMENT_STATUS_LABELS = {
    working: 'Working',
    job_search: 'Job Searching',
    higher_studies: 'Higher Studies',
    entrepreneur: 'Entrepreneurship',
    other: 'Other'
};

const DEFAULT_LABEL = 'Not specified';

const titleCase = (value = '') =>
    value
        .toString()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());

const mapAggregatesToList = (records = [], labelMap = {}) =>
    records.map(({ _id, count }) => {
        const key = typeof _id === 'string' ? _id.trim() : _id;
        const mapped =
            (key && labelMap[key]) ||
            (key ? titleCase(key) : DEFAULT_LABEL);
        return { label: mapped, count };
    });

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!requireAdmin(req, res)) {
        return;
    }

    try {
        await connectDb();

        // Get total students count
        const totalStudents = await Student.countDocuments();

        // Get total calls count
        const totalCalls = await CallLog.countDocuments();

        // Get completed calls count
        const completedCalls = await CallLog.countDocuments({ status: 'Completed' });

        // Get pending calls (calls with needs_follow_up = true or status != 'Completed')
        const pendingCalls = await CallLog.countDocuments({
            $or: [
                { needs_follow_up: true },
                { status: { $ne: 'Completed' } }
            ]
        });

        // Date boundaries for today, this week, this month
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const todaysCalls = await CallLog.countDocuments({
            timestamp: { $gte: startOfToday }
        });
        const weeksCalls = await CallLog.countDocuments({
            timestamp: { $gte: startOfWeek }
        });
        const monthsCalls = await CallLog.countDocuments({
            timestamp: { $gte: startOfMonth }
        });

        // Find the most recent Friday
        const today = new Date();
        const dayOfWeek = today.getDay();
        // 5 = Friday, so go back (dayOfWeek + 2) % 7 days if today is after Friday, else go back (dayOfWeek + 7 - 5) % 7
        let daysSinceFriday = (dayOfWeek >= 5) ? dayOfWeek - 5 : dayOfWeek + 2;
        const lastFriday = new Date(today);
        lastFriday.setDate(today.getDate() - daysSinceFriday);
        lastFriday.setHours(0, 0, 0, 0);
        const endOfFriday = new Date(lastFriday);
        endOfFriday.setHours(23, 59, 59, 999);

        // Group call logs for last Friday by notes
        const fridayLogs = await CallLog.aggregate([
            { $match: { timestamp: { $gte: lastFriday, $lte: endOfFriday } } },
            { $group: { _id: '$notes', count: { $sum: 1 } } }
        ]);
        // Map to expected keys
        const fridayReasons = { Coming: 0, Job: 0, Lecture: 0, Other: 0 };
        fridayLogs.forEach(log => {
            if (log._id === 'Coming') fridayReasons.Coming += log.count;
            else if (log._id === 'Job') fridayReasons.Job += log.count;
            else if (log._id === 'Lecture') fridayReasons.Lecture += log.count;
            else if (log._id && log._id.trim()) fridayReasons.Other += log.count;
        });

        // --- Student analytics ---
        const institutionAgg = await Student.aggregate([
            { $group: { _id: { $ifNull: ['$study_institution', ''] }, count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const programAgg = await Student.aggregate([
            { $group: { _id: { $ifNull: ['$study', ''] }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 6 }
        ]);
        const postGradAgg = await Student.aggregate([
            { $group: { _id: { $ifNull: ['$post_graduation_plan', ''] }, count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const employmentAgg = await Student.aggregate([
            { $group: { _id: { $ifNull: ['$employment_status', ''] }, count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const studyInsights = {
            byInstitution: mapAggregatesToList(institutionAgg, INSTITUTION_LABELS),
            topPrograms: mapAggregatesToList(programAgg).map((entry, index) => ({
                ...entry,
                rank: index + 1
            })),
            postGradPlans: mapAggregatesToList(postGradAgg, POST_GRAD_PLAN_LABELS),
            employmentStatus: mapAggregatesToList(employmentAgg, EMPLOYMENT_STATUS_LABELS)
        };

        const movedOutCount = await Student.countDocuments({ moved_out: true });
        studyInsights.residency = {
            active: Math.max(totalStudents - movedOutCount, 0),
            movedOut: movedOutCount
        };

        res.status(200).json({
            success: true,
            stats: {
                totalStudents,
                totalCalls,
                completedCalls,
                pendingCalls,
                todaysCalls,
                weeksCalls,
                monthsCalls,
                fridayReasons,
                studyInsights
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
} 
