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

  payload.last_portal_update_at = student.last_portal_update_at
    ? new Date(student.last_portal_update_at).toISOString()
    : null;
  payload.last_portal_update_fields = Array.isArray(student.last_portal_update_fields)
    ? [...student.last_portal_update_fields]
    : [];

  return payload;
}

const valuesDiffer = (previousValue, nextValue) => {
  if (previousValue instanceof Date || nextValue instanceof Date) {
    const prevTime = previousValue instanceof Date ? previousValue.getTime() : (previousValue ? new Date(previousValue).getTime() : null);
    const nextTime = nextValue instanceof Date ? nextValue.getTime() : (nextValue ? new Date(nextValue).getTime() : null);
    return prevTime !== nextTime;
  }
  if (typeof previousValue === 'string' || typeof nextValue === 'string') {
    return (previousValue || '') !== (nextValue || '');
  }
  if (typeof previousValue === 'boolean' || typeof nextValue === 'boolean') {
    return Boolean(previousValue) !== Boolean(nextValue);
  }
  if (Array.isArray(previousValue) || Array.isArray(nextValue)) {
    return JSON.stringify(previousValue || []) !== JSON.stringify(nextValue || []);
  }
  return previousValue !== nextValue;
};

export function applyPortalUpdates(studentDoc, updates) {
  if (!studentDoc || !updates) {
    return { changedFields: [] };
  }

  const changedFields = new Set();

  const assignIfChanged = (field, nextValue) => {
    const previousValue = typeof studentDoc.get === 'function' ? studentDoc.get(field) : studentDoc[field];
    if (valuesDiffer(previousValue, nextValue)) {
      changedFields.add(field);
    }
    studentDoc[field] = nextValue;
  };

  if (Object.prototype.hasOwnProperty.call(updates, 'phone')) {
    assignIfChanged('phone', sanitizeString(updates.phone));
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
      assignIfChanged(field, formatDate(value));
      return;
    }

    if (BOOLEAN_FIELDS.includes(field)) {
      const normalized = Boolean(value);
      assignIfChanged(field, normalized);
      if (field === 'graduation_completed' && !normalized) {
        assignIfChanged('graduation_date', null);
      }
      return;
    }

    if (field === 'mail_id') {
      assignIfChanged('mail_id', sanitizeString(value).toLowerCase());
      return;
    }

    if (field === 'post_graduation_plan') {
      const plan = sanitizeString(value);
      assignIfChanged('post_graduation_plan', plan);
      if (!Object.prototype.hasOwnProperty.call(updates, 'employment_status')) {
        assignIfChanged('employment_status', plan);
      }
      if (plan !== 'working') {
        assignIfChanged('employment_company', '');
        assignIfChanged('employment_role', '');
      }
      return;
    }

    if (field === 'employment_status') {
      assignIfChanged('employment_status', sanitizeString(value));
      return;
    }

    if (field === 'employment_company' || field === 'employment_role') {
      if (studentDoc.post_graduation_plan === 'working') {
        assignIfChanged(field, sanitizeString(value));
      } else {
        assignIfChanged(field, '');
      }
      return;
    }

    if (field === 'study_program' || field === 'study_specialization') {
      shouldRebuildStudy = true;
      assignIfChanged(field, sanitizeString(value));
      return;
    }

    if (field === 'study') {
      assignIfChanged('study', sanitizeString(value));
      return;
    }

    assignIfChanged(field, sanitizeString(value));
  });

  if (!Object.prototype.hasOwnProperty.call(updates, 'study') && shouldRebuildStudy) {
    const summary = buildStudySummary(studentDoc);
    assignIfChanged('study', summary);
  }

  if (!studentDoc.employment_status && studentDoc.post_graduation_plan) {
    assignIfChanged('employment_status', studentDoc.post_graduation_plan);
  }

  if (changedFields.size > 0) {
    studentDoc.last_portal_update_at = new Date();
    studentDoc.last_portal_update_fields = Array.from(changedFields);
  }

  studentDoc.updated_at = new Date();

  return { changedFields: Array.from(changedFields) };
}

export const STUDENT_PORTAL_FIELD_CONFIG = STUDENT_PORTAL_FIELD_DEFS;
