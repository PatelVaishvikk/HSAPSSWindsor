import connectDb from '../../../lib/db.js';
import Student from '../../../models/Student.js';
import { buildPortalStudentPayload, getPortalPassword } from '../../../lib/studentPortalUtils.js';
import { buildAuthCookies, createPortalTokens } from '../../../lib/portalSession.js';
import { ADMIN_SHORTCUTS, canAccessAdminTools } from '../../../lib/portalAdmin.js';

const normalizePhoneDigits = (value) =>
  typeof value === 'string' ? value.replace(/\D+/g, '') : '';

export default async function handler(req, res) {
  console.log('[SIMPLE-LOGIN] Request received');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[SIMPLE-LOGIN] Connecting to DB...');
    await connectDb();
    console.log('[SIMPLE-LOGIN] DB Connected');
    
    const { phone, password } = req.body || {};
    console.log('[SIMPLE-LOGIN] Phone:', phone);
    
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    const normalizedPhone = normalizePhoneDigits(phone);
    console.log('[SIMPLE-LOGIN] Normalized phone:', normalizedPhone);
    
    const student = await Student.findOne({ phone: normalizedPhone });
    console.log('[SIMPLE-LOGIN] Student found:', Boolean(student));

    if (!student) {
      return res.status(401).json({ error: 'No student found with that phone number' });
    }

    // BYPASS PASSWORD CHECK - just check if it matches default password
    const defaultPassword = getPortalPassword();
    console.log('[SIMPLE-LOGIN] Checking password against default...');
    
    if (password !== defaultPassword) {
      console.log('[SIMPLE-LOGIN] Password does not match default');
      return res.status(401).json({ error: 'Invalid password. Use the default password: ' + defaultPassword });
    }

    console.log('[SIMPLE-LOGIN] Password matches! Creating tokens...');
    const tokens = await createPortalTokens(student._id);
    
    const cookies = buildAuthCookies(tokens);
    res.setHeader('Set-Cookie', cookies);

    const payload = buildPortalStudentPayload(student);
    const allowAdmin = canAccessAdminTools(student);
    
    const meta = {
      has_custom_password: false,
      used_default_password: true,
      can_access_admin: allowAdmin,
      admin_shortcuts: allowAdmin ? ADMIN_SHORTCUTS : []
    };

    console.log('[SIMPLE-LOGIN] Success, returning response');
    return res.status(200).json({
      student: payload,
      meta
    });

  } catch (error) {
    console.error('[SIMPLE-LOGIN ERROR]', error);
    if (!res.headersSent) {
        return res.status(500).json({ error: error.message || 'Internal server error during login' });
    }
  }
}
