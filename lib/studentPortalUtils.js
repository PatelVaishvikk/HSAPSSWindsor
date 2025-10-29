import { STUDENT_PORTAL_FIELD_DEFS, STUDENT_PORTAL_FIELD_NAMES } from '../config/studentPortalFields.js';

const DEFAULT_PORTAL_PASSWORD = 'dasnadas';

const DATE_FIELDS = ['date_of_birth', 'graduation_date'];
const BOOLEAN_FIELDS = ['graduation_completed'];
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export const PORTAL_EDITABLE_FIELDS = [...STUDENT_PORTAL_FIELD_NAMES];

const toUtcNoon = (year, monthIndex, day) => new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));

const sanitizeString = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
};

const formatDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return toUtcNoon(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const isoMatch = ISO_DATE_REGEX.exec(trimmed);
    if (isoMatch) {
      const [, yearStr, monthStr, dayStr] = isoMatch;
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;
      const day = Number(dayStr);
      if (Number.isNaN(year) || Number.isNaN(monthIndex) || Number.isNaN(day)) {
        return null;
      }
      return toUtcNoon(year, monthIndex, day);
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toUtcNoon(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
};

const formatDateForClient = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().split('T')[0];
};

const buildStudySummary = (student) => {
  const program = sanitizeString(student.study_program);
  const specialization = sanitizeString(student.study_specialization);
  const parts = [];
  if (program) parts.push(program);
  if (specialization) parts.push(specialization);
  return parts.join(' - ');
};

export const getPortalPassword = () => process.env.STUDENT_PORTAL_PASSWORD || DEFAULT_PORTAL_PASSWORD;

export function buildPortalStudentPayload(studentDoc) {
  if (!studentDoc) {
    return null;
  }

  const student = studentDoc.toObject ? studentDoc.toObject() : studentDoc;
  const payload = {
    _id: student._id.toString()
  };

  PORTAL_EDITABLE_FIELDS.forEach((field) => {
    if (DATE_FIELDS.includes(field)) {
      payload[field] = formatDateForClient(student[field]);
    } else if (BOOLEAN_FIELDS.includes(field)) {
      payload[field] = Boolean(student[field]);
    } else {
      payload[field] = sanitizeString(student[field]);
    }
  });

  if (!payload.study) {
    payload.study = buildStudySummary(student);
  }

  if (!payload.employment_status && payload.post_graduation_plan) {
    payload.employment_status = payload.post_graduation_plan;
  }

  return payload;
}

export function applyPortalUpdates(studentDoc, updates) {
  if (!studentDoc || !updates) {
    return;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'phone')) {
    studentDoc.phone = sanitizeString(updates.phone);
  }

  let shouldRebuildStudy = false;

  PORTAL_EDITABLE_FIELDS.forEach((field) => {
    if (field === 'phone') {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(updates, field)) {
      return;
    }

    const value = updates[field];

    if (DATE_FIELDS.includes(field)) {
      studentDoc[field] = formatDate(value);
      return;
    }

    if (BOOLEAN_FIELDS.includes(field)) {
      studentDoc[field] = Boolean(value);
      if (field === 'graduation_completed' && !studentDoc[field]) {
        studentDoc.graduation_date = null;
      }
      return;
    }

    if (field === 'mail_id') {
      studentDoc.mail_id = sanitizeString(value).toLowerCase();
      return;
    }

    if (field === 'post_graduation_plan') {
      const plan = sanitizeString(value);
      studentDoc.post_graduation_plan = plan;
      if (!Object.prototype.hasOwnProperty.call(updates, 'employment_status')) {
        studentDoc.employment_status = plan;
      }
      if (plan !== 'working') {
        studentDoc.employment_company = '';
        studentDoc.employment_role = '';
      }
      return;
    }

    if (field === 'employment_status') {
      studentDoc.employment_status = sanitizeString(value);
      return;
    }

    if (field === 'employment_company' || field === 'employment_role') {
      if (studentDoc.post_graduation_plan === 'working') {
        studentDoc[field] = sanitizeString(value);
      } else {
        studentDoc[field] = '';
      }
      return;
    }

    if (field === 'study_program' || field === 'study_specialization') {
      shouldRebuildStudy = true;
      studentDoc[field] = sanitizeString(value);
      return;
    }

    if (field === 'study') {
      studentDoc.study = sanitizeString(value);
      return;
    }

    studentDoc[field] = sanitizeString(value);
  });

  if (!Object.prototype.hasOwnProperty.call(updates, 'study') && shouldRebuildStudy) {
    studentDoc.study = buildStudySummary(studentDoc);
  }

  if (!studentDoc.employment_status && studentDoc.post_graduation_plan) {
    studentDoc.employment_status = studentDoc.post_graduation_plan;
  }

  studentDoc.updated_at = new Date();
}

export const STUDENT_PORTAL_FIELD_CONFIG = STUDENT_PORTAL_FIELD_DEFS;
