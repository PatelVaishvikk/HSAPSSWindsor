const PORTAL_ADMIN_PHONES = ['5199927920'];

export const ADMIN_SHORTCUTS = [
  {
    href: '/admin/dashboard',
    label: 'Admin Dashboard',
    icon: 'fas fa-gauge-high'
  },
  {
    href: '/students-table',
    label: 'Manage Yuvaks',
    icon: 'fas fa-users'
  },
  {
    href: '/attendance',
    label: 'Attendance',
    icon: 'fas fa-calendar-check'
  }
];

const normalizePhoneDigits = (value) =>
  typeof value === 'string' ? value.replace(/\D+/g, '') : '';

export const canAccessAdminTools = (student) => {
  if (!student) {
    return false;
  }
  const normalizedPhone = normalizePhoneDigits(student.phone);
  const storedNormalized = normalizePhoneDigits(student.phone_normalized);
  return PORTAL_ADMIN_PHONES.some(
    (adminPhone) => adminPhone === normalizedPhone || adminPhone === storedNormalized
  );
};
