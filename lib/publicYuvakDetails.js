const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export const PUBLIC_YUVAK_FIELDS = [
  'first_name',
  'last_name',
  'phone',
  'date_of_birth',
  'address_street',
  'apartment_number',
  'address_city',
  'address_state',
  'address',
  'mandal_name'
];

export const PUBLIC_REQUIRED_FIELDS = [
  'phone',
  'date_of_birth',
  'address_street',
  'address_city',
  'address_state',
  'mandal_name'
];

export const PUBLIC_REQUIRED_LABELS = {
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone number',
  date_of_birth: 'Birthdate',
  address_street: 'Street address',
  address_city: 'City',
  address_state: 'State / Province',
  mandal_name: 'Mandal'
};

const normalizeString = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
};

export const normalizePhoneDigits = (value) =>
  typeof value === 'string' ? value.replace(/\D+/g, '') : '';

const isAddressComponent = (field) =>
  ['address_street', 'apartment_number', 'address_city', 'address_state'].includes(field);

const composeAddress = (source = {}) => {
  const street = normalizeString(source.address_street);
  const apartment = normalizeString(source.apartment_number);
  const city = normalizeString(source.address_city);
  const state = normalizeString(source.address_state);

  return [
    street,
    apartment ? `Unit ${apartment}` : '',
    city,
    state
  ].filter(Boolean).join(', ');
};

const parseAddressParts = (address = '', fallbackCity = '') => {
  const parts = normalizeString(address)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const [street = '', second = '', third = '', fourth = ''] = parts;
  const secondLooksLikeApartment = /^(apt|unit|#|suite)\b/i.test(second);

  return {
    address_street: street,
    apartment_number: secondLooksLikeApartment
      ? second.replace(/^(apt|unit|suite)\s*/i, '').replace(/^#\s*/, '').trim()
      : '',
    address_city: secondLooksLikeApartment ? third : second || normalizeString(fallbackCity),
    address_state: secondLooksLikeApartment ? fourth : third
  };
};

const toUtcNoon = (year, monthIndex, day) =>
  new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));

export const formatDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return toUtcNoon(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const match = DATE_ONLY_REGEX.exec(trimmed);
    if (match) {
      const [, yearStr, monthStr, dayStr] = match;
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;
      const day = Number(dayStr);
      if (!Number.isNaN(year) && !Number.isNaN(monthIndex) && !Number.isNaN(day)) {
        return toUtcNoon(year, monthIndex, day);
      }
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toUtcNoon(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
};

const formatDateForClient = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const valuesDiffer = (previousValue, nextValue) => {
  if (previousValue instanceof Date || nextValue instanceof Date) {
    const previousTime = previousValue ? new Date(previousValue).getTime() : null;
    const nextTime = nextValue ? new Date(nextValue).getTime() : null;
    return previousTime !== nextTime;
  }

  return normalizeString(previousValue) !== normalizeString(nextValue);
};

const phoneMatches = (student, inputDigits) => {
  const digits = normalizePhoneDigits(inputDigits);
  if (digits.length < 10) return false;

  const lastTen = digits.slice(-10);
  const storedDigits = normalizePhoneDigits(student.phone_normalized || student.phone || '');
  return storedDigits === digits || storedDigits.endsWith(lastTen);
};

export async function findYuvakByPhone(Student, phone) {
  const rawPhone = normalizeString(phone);
  const digits = normalizePhoneDigits(rawPhone);
  if (digits.length < 10) {
    return null;
  }

  const variants = Array.from(new Set([digits, digits.slice(-10)].filter(Boolean)));
  const directCandidates = await Student.find({
    $or: [
      { phone_normalized: { $in: variants } },
      { phone: rawPhone }
    ]
  }).limit(10);

  const directMatch = directCandidates.find((student) => phoneMatches(student, digits));
  if (directMatch) {
    return directMatch;
  }

  const lastTen = digits.slice(-10);
  const loosePattern = lastTen.split('').join('\\D*');
  const looseCandidates = await Student.find({
    phone: { $regex: loosePattern }
  }).limit(20);

  return looseCandidates.find((student) => phoneMatches(student, digits)) || null;
}

export function pickPublicYuvakUpdates(source = {}) {
  const updates = {};

  PUBLIC_YUVAK_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(source, field)) {
      return;
    }

    updates[field] = normalizeString(source[field]);
  });

  const hasAddressComponents = PUBLIC_YUVAK_FIELDS.some(
    (field) => isAddressComponent(field) && Object.prototype.hasOwnProperty.call(source, field)
  );
  if (hasAddressComponents) {
    updates.address = composeAddress(source);
  }

  return updates;
}

export function buildPublicYuvakPayload(studentDoc) {
  if (!studentDoc) return null;
  const student = studentDoc.toObject ? studentDoc.toObject() : studentDoc;

  const parsedAddress = parseAddressParts(student.address, student.mandal_name);

  return {
    first_name: normalizeString(student.first_name),
    last_name: normalizeString(student.last_name),
    phone: normalizeString(student.phone),
    date_of_birth: formatDateForClient(student.date_of_birth),
    address: normalizeString(student.address),
    ...parsedAddress,
    mandal_name: normalizeString(student.mandal_name)
  };
}

export function getMissingRequiredFields(profile = {}) {
  return PUBLIC_REQUIRED_FIELDS.filter((field) => {
    const value = profile[field];
    return typeof value === 'string' ? value.trim() === '' : !value;
  });
}

export function validatePublicYuvakPayload(updates, existingStudent = null) {
  const base = existingStudent ? buildPublicYuvakPayload(existingStudent) : {};
  const merged = { ...base, ...updates };
  const errors = [];

  if (!existingStudent) {
    ['first_name', 'last_name'].forEach((field) => {
      if (!normalizeString(merged[field])) {
        errors.push(`${PUBLIC_REQUIRED_LABELS[field]} is required`);
      }
    });
  }

  getMissingRequiredFields(merged).forEach((field) => {
    errors.push(`${PUBLIC_REQUIRED_LABELS[field] || field} is required`);
  });

  const phoneDigits = normalizePhoneDigits(merged.phone);
  if (phoneDigits.length < 10) {
    errors.push('Phone number must include at least 10 digits');
  }

  if (merged.date_of_birth && !formatDate(merged.date_of_birth)) {
    errors.push('Birthdate must be valid');
  }

  return errors;
}

export function applyPublicYuvakUpdates(studentDoc, updates) {
  const changedFields = new Set();

  const assignIfChanged = (field, nextValue) => {
    const previousValue = typeof studentDoc.get === 'function' ? studentDoc.get(field) : studentDoc[field];
    if (valuesDiffer(previousValue, nextValue)) {
      changedFields.add(field);
    }
    studentDoc[field] = nextValue;
  };

  if (Object.prototype.hasOwnProperty.call(updates, 'phone')) {
    const phone = normalizeString(updates.phone);
    assignIfChanged('phone', phone);
    assignIfChanged('phone_normalized', normalizePhoneDigits(phone));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'first_name')) {
    assignIfChanged('first_name', normalizeString(updates.first_name));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'last_name')) {
    assignIfChanged('last_name', normalizeString(updates.last_name));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'date_of_birth')) {
    assignIfChanged('date_of_birth', formatDate(updates.date_of_birth));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'address')) {
    assignIfChanged('address', normalizeString(updates.address));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'mandal_name')) {
    assignIfChanged('mandal_name', normalizeString(updates.mandal_name));
  }

  if (changedFields.size > 0) {
    changedFields.delete('phone_normalized');
    studentDoc.last_portal_update_at = new Date();
    studentDoc.last_portal_update_fields = Array.from(changedFields);
  }

  return { changedFields: Array.from(changedFields) };
}
