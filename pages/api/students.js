import connectDb from '../../lib/db';
import Student from '../../models/Student';
import CallLog from '../../models/CallLog';

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const formatDate = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DATE_ONLY_REGEX.test(trimmed)) {
      const [, yearStr, monthStr, dayStr] = DATE_ONLY_REGEX.exec(trimmed);
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;
      const day = Number(dayStr);
      if (!Number.isNaN(year) && !Number.isNaN(monthIndex) && !Number.isNaN(day)) {
        return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));
      }
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0, 0));
};

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

export default async function handler(req, res) {
  await connectDb();
  const { method } = req;

  switch (method) {
    case 'GET': {
      try {
        const { page, limit, search, study } = req.query;
        const pageNum = parseInt(page || '1', 10);
        const limitNum = parseInt(limit || '0', 10);
        const conditions = [];

        if (search && search.trim()) {
          const searchRegex = new RegExp(search.trim(), 'i');
          conditions.push({
            $or: [
              { first_name: searchRegex },
              { last_name: searchRegex },
              { mail_id: searchRegex },
              { phone: searchRegex },
              { study: searchRegex }
            ]
          });
        }

        if (study && study.trim()) {
          const trimmedStudy = study.trim();
          if (trimmedStudy === '__none__') {
            conditions.push({
              $or: [
                { study: { $exists: false } },
                { study: '' },
                { study: null }
              ]
            });
          } else {
            conditions.push({ study: trimmedStudy });
          }
        }

        const filterQuery =
          conditions.length === 0 ? {} :
          conditions.length === 1 ? conditions[0] :
          { $and: conditions };

        const total = await Student.countDocuments(filterQuery);
        let studentsQuery = Student.find(filterQuery).sort({ created_at: -1 });
        if (limitNum > 0) {
          const skip = (pageNum - 1) * limitNum;
          studentsQuery = studentsQuery.skip(skip).limit(limitNum);
        }

        const studentsList = await studentsQuery.lean();
        const students = studentsList.map((student) => ({
          ...student,
          _id: student._id.toString(),
          ...(student.date_of_birth
            ? { date_of_birth: new Date(student.date_of_birth).toISOString().split('T')[0] }
            : {}),
          ...(student.graduation_date
            ? { graduation_date: new Date(student.graduation_date).toISOString().split('T')[0] }
            : {}),
        }));

        res.status(200).json({ students, total, currentPage: pageNum });
      } catch (err) {
        console.error('Error fetching students:', err);
        res.status(500).json({ error: 'Failed to fetch students' });
      }
      break;
    }

    case 'POST': {
      try {
        const data = req.body;
        data.first_name = normalizeString(data.first_name);
        data.last_name = normalizeString(data.last_name);
        const normalizedEmail = data.mail_id ? data.mail_id.trim().toLowerCase() : '';
        data.mail_id = normalizedEmail;
        data.phone = normalizeString(data.phone);
        data.address = normalizeString(data.address);
        data.gender = normalizeString(data.gender);
        data.education = normalizeString(data.education);
        data.study_level = normalizeString(data.study_level);
        data.study_institution = normalizeString(data.study_institution);
        data.study_program = normalizeString(data.study_program);
        data.study_specialization = normalizeString(data.study_specialization);
        data.study = normalizeString(data.study);
        data.emergency_contact = normalizeString(data.emergency_contact);
        data.notes = normalizeString(data.notes);
        data.post_graduation_plan = normalizeString(data.post_graduation_plan);
        data.employment_status = normalizeString(data.employment_status || data.post_graduation_plan);
        data.employment_company = normalizeString(data.employment_company);
        data.employment_role = normalizeString(data.employment_role);
        data.graduation_completed = !!data.graduation_completed;
        if (!data.education && data.study_level) {
          data.education = data.study_level;
        }
        if (!data.study) {
          const parts = [];
          if (data.study_program) parts.push(data.study_program);
          if (data.study_specialization) parts.push(data.study_specialization);
          data.study = parts.join(' - ');
        }

        if (normalizedEmail !== '') {
          const existingStudent = await Student.findOne({ mail_id: normalizedEmail });
          if (existingStudent) {
            return res.status(400).json({ error: 'Email already exists' });
          }
        }

        if (data.date_of_birth) {
          data.date_of_birth = formatDate(data.date_of_birth);
        }

        if (data.graduation_completed && data.graduation_date) {
          data.graduation_date = formatDate(data.graduation_date);
        } else {
          data.graduation_date = null;
        }

        const movedOutFields = [
          'moved_out',
          'moved_out_date',
          'moved_out_job',
          'moved_out_address',
          'moved_out_notes'
        ];

        for (const field of movedOutFields) {
          if (Object.prototype.hasOwnProperty.call(data, field)) {
            if (field === 'moved_out_date' && data[field]) {
              data[field] = formatDate(data[field]);
            }
          }
        }

        const newStudent = new Student(data);
        await newStudent.save();
        const studentObj = newStudent.toObject();
        studentObj._id = studentObj._id.toString();
        res.status(201).json({ student: studentObj });
      } catch (err) {
        console.error('Error adding student:', err);
        if (err.code === 11000) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        if (err.name === 'ValidationError') {
          const messages = Object.values(err.errors).map((e) => e.message);
          return res.status(400).json({ error: messages.join('; ') });
        }
        res.status(500).json({ error: err.message || 'Failed to add student' });
      }
      break;
    }

    case 'PUT': {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Missing student id' });
      }
      try {
        const student = await Student.findById(id);
        if (!student) {
          return res.status(404).json({ error: 'Student not found' });
        }

        const fields = [
          'first_name',
          'last_name',
          'mail_id',
          'phone',
          'address',
          'date_of_birth',
          'gender',
          'education',
          'study',
          'study_level',
          'study_institution',
          'study_program',
          'study_specialization',
          'emergency_contact',
          'notes',
          'box_cricket',
          'box_cricket_years',
          'atmiya_cricket_tournament',
          'atmiya_cricket_years',
          'atmiya_youth_shibir',
          'atmiya_youth_years',
          'yuva_mahotsav',
          'yuva_mahotsav_years',
          'harimay',
          'moved_out',
          'moved_out_date',
          'moved_out_job',
          'moved_out_address',
          'moved_out_notes',
          'graduation_completed',
          'graduation_date',
          'post_graduation_plan',
          'employment_status',
          'employment_company',
          'employment_role'
        ];

        for (const field of fields) {
          if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            if (field === 'mail_id') {
              student.mail_id = req.body.mail_id ? req.body.mail_id.trim().toLowerCase() : '';
            } else if (field === 'date_of_birth' || field === 'moved_out_date') {
              student[field] = req.body[field] ? formatDate(req.body[field]) : null;
            } else if (field === 'graduation_completed') {
              student.graduation_completed = !!req.body.graduation_completed;
              if (!student.graduation_completed) {
                student.graduation_date = null;
              }
            } else if (field === 'graduation_date') {
              student.graduation_date =
                req.body.graduation_date && (req.body.graduation_completed ?? student.graduation_completed)
                  ? formatDate(req.body.graduation_date)
                  : null;
            } else {
              student[field] = req.body[field];
            }
          }
        }

        const stringFields = [
          'first_name',
          'last_name',
          'phone',
          'address',
          'gender',
          'education',
          'study',
          'study_level',
          'study_institution',
          'study_program',
          'study_specialization',
          'emergency_contact',
          'notes',
          'moved_out_job',
          'moved_out_address',
          'moved_out_notes',
          'post_graduation_plan',
          'employment_status',
          'employment_company',
          'employment_role'
        ];

        stringFields.forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            student[field] = normalizeString(student[field]);
          }
        });

        if (!student.education && student.study_level) {
          student.education = student.study_level;
        }

        await student.save();
        const updatedStudent = student.toObject();
        updatedStudent._id = updatedStudent._id.toString();
        if (updatedStudent.date_of_birth) {
          updatedStudent.date_of_birth = new Date(updatedStudent.date_of_birth).toISOString().split('T')[0];
        }
        if (updatedStudent.graduation_date) {
          updatedStudent.graduation_date = new Date(updatedStudent.graduation_date).toISOString().split('T')[0];
        }
        res.status(200).json({ student: updatedStudent });
      } catch (err) {
        console.error('Error updating student:', err);
        if (err.code === 11000) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        if (err.name === 'ValidationError') {
          const messages = Object.values(err.errors).map((e) => e.message);
          return res.status(400).json({ error: messages.join('; ') });
        }
        res.status(500).json({ error: err.message || 'Failed to update student' });
      }
      break;
    }

    case 'DELETE': {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Missing student id' });
      }
      try {
        const deletedStudent = await Student.findByIdAndDelete(id);
        if (!deletedStudent) {
          return res.status(404).json({ error: 'Student not found' });
        }
        await CallLog.deleteMany({ student_id: id });
        res.status(200).json({ message: 'Student deleted successfully' });
      } catch (err) {
        console.error('Error deleting student:', err);
        res.status(500).json({ error: 'Failed to delete student' });
      }
      break;
    }

    default: {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ error: `Method ${method} not allowed` });
    }
  }
}

