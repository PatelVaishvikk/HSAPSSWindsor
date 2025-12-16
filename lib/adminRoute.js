import { isAdminRequest } from './adminAuth.js';
import { getStudentFromRequest } from './studentPortalUtils.js';
import { canAccessAdminTools, SUPER_ADMIN_PHONES } from './portalAdmin.js';

export async function requireAdmin(req, res) {
  // 1. Check Portal Admin (Student-based) - PRIORITY
  // This allows testing strictly as the logged-in student, even if a global cookie exists.
  const student = await getStudentFromRequest(req);
  if (student && canAccessAdminTools(student)) {
    const normalizePhoneDigits = (value) => (typeof value === 'string' ? value.replace(/\D+/g, '') : '');
    const phone = normalizePhoneDigits(student.phone);
    const storedPhone = normalizePhoneDigits(student.phone_normalized);
    
    // Check if this specific student is a designated Super Admin
    const isSuper = SUPER_ADMIN_PHONES.some(p => p === phone || p === storedPhone);
    
    req.adminRights = {
      isSuper,
      mandal: isSuper ? null : (student.mandal_name || null)
    };
    return true;
  }

  // 2. Check Global Admin (Cookie-based) -> ALWAYS Super Admin
  // Fallback for the main /admin/dashboard outside the portal context
  if (isAdminRequest(req)) {
    req.adminRights = { isSuper: true, mandal: null };
    return true;
  }

  res.status(401).json({ error: 'Unauthorized' });
  return false;
}
