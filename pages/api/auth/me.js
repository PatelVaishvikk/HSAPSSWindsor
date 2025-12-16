import { requireAdmin } from '../../../lib/adminRoute';
import { getStudentFromRequest } from '../../../lib/studentPortalUtils';
import { canAccessAdminTools, SUPER_ADMIN_PHONES } from '../../../lib/portalAdmin';

export default async function handler(req, res) {
  const authorized = await requireAdmin(req, res);
  if (!authorized) return;

  // Re-derive student info for the frontend
  // requireAdmin already validates access, but we want to send back specific flags
  // We can re-use the logic or just use req.adminRights if we attached it (we did!)
  
  const { isSuper, mandal } = req.adminRights || {};
  
  // Also try to get the student object for context (name, phone)
  const student = await getStudentFromRequest(req);
  
  res.status(200).json({
    user: {
      phone: student?.phone || 'Global Admin',
      isSuper: !!isSuper,
      mandal_name: mandal,
      name: student ? `${student.first_name} ${student.last_name}` : 'Admin'
    }
  });
}
