
import { formatDistanceToNowStrict } from 'date-fns';
import { STUDENT_PORTAL_FIELD_DEFS } from '../config/studentPortalFields';
import { INSTITUTION_OPTIONS, POST_GRAD_OPTIONS, PROGRAM_LIBRARY, EDUCATION_LEVEL_LABELS } from '../config/adminConstants';

// Helper Maps
const INSTITUTION_LABEL_MAP = INSTITUTION_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {}
);

const POST_GRAD_LABEL_MAP = POST_GRAD_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {}
);

const PORTAL_FIELD_LABEL_MAP = STUDENT_PORTAL_FIELD_DEFS.reduce((acc, field) => {
  acc[field.name] = field.label;
  return acc;
}, {});

export const stringToColor = (str) => {
  if (!str) return '#e0e0e0';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - color.length) + color;
};

export const getProgramDefinition = (institution, programValue) => {
  const list = PROGRAM_LIBRARY[institution] || [];
  return list.find((program) => program.value === programValue) || null;
};

export const formatEducationLevel = (level) => {
  if (!level) return 'N/A';
  return (
    EDUCATION_LEVEL_LABELS[level] ||
    level.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

export const formatInstitution = (value) =>
  INSTITUTION_LABEL_MAP[value] ||
  (value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'N/A');

export const formatPostGradPlan = (value) =>
  POST_GRAD_LABEL_MAP[value] ||
  (value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '');

export const formatGender = (value) =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'N/A';

export const formatYearList = (value) => {
  if (!value) return '-';
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '-';
  }
  return value;
};

export const formatPortalUpdateTime = (timestamp) => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${formatDistanceToNowStrict(date)} ago`;
};

export const humanizePortalField = (fieldName) =>
  PORTAL_FIELD_LABEL_MAP[fieldName] ||
  fieldName.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export const summarizePortalFields = (fields = []) => {
  if (!Array.isArray(fields) || fields.length === 0) return '';
  const filtered = fields.filter((field) => field && field !== 'phone_normalized');
  if (filtered.length === 0) return '';
  const labels = filtered.map(humanizePortalField);
  if (labels.length <= 2) {
    return labels.join(', ');
  }
  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2} more`;
};

export const isRecentPortalUpdate = (timestamp, days = 7) => {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;
  const delta = Date.now() - date.getTime();
  return delta >= 0 && delta <= days * 24 * 60 * 60 * 1000;
};

// Date Utils
const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const toUtcMidday = (year, monthIndex, day) => new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));

export const parseDateToUtc = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const directMatch = DATE_ONLY_REGEX.exec(trimmed);
    if (directMatch) {
      const [, yearStr, monthStr, dayStr] = directMatch;
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;
      const day = Number(dayStr);
      if (!Number.isNaN(year) && !Number.isNaN(monthIndex) && !Number.isNaN(day)) {
        return toUtcMidday(year, monthIndex, day);
      }
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return toUtcMidday(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const formatDateForInput = (dateValue) => {
  const parsed = parseDateToUtc(dateValue);
  if (!parsed) return '';
  return parsed.toISOString().split('T')[0];
};

export const formatDateForDisplay = (dateString) => {
  const parsed = parseDateToUtc(dateString);
  if (!parsed) return '';
  return parsed.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
