import connectDb from '../../../lib/db.js';
import Student from '../../../models/Student.js';
import {
  buildPortalStudentPayload,
  getPortalPassword
} from '../../../lib/studentPortalUtils.js';
import { verifyStudentPortalSecret } from '../../../lib/studentPortalAuth.js';
import { buildAuthCookies, createPortalTokens } from '../../../lib/portalSession.js';
import { ADMIN_SHORTCUTS, canAccessAdminTools } from '../../../lib/portalAdmin.js';
import fs from 'fs';

const normalizePhoneDigits = (value) =>
  typeof value === 'string' ? value.replace(/\D+/g, '') : '';

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync('login-debug.log', logMessage);
  } catch (e) {
    // Ignore file write errors
  }
}

// Helper to timeout the request if it takes too long (e.g. slow DB)
const withTimeout = (promise, ms = 8000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Login request timed out')), ms)
        )
    ]);
};

export default async function handler(req, res) {
  log('[LOGIN] ===== REQUEST RECEIVED =====');
  log('[LOGIN] Method: ' + req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    log('[LOGIN] Connecting to DB...');
    await connectDb();
    log('[LOGIN] DB Connected');
    
    const { phone, password } = req.body || {};
    
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    const normalizedPhone = normalizePhoneDigits(phone);
    console.log('[LOGIN] Searching for student:', normalizedPhone);
    
    // Find student by normalized phone
    const student = await Student.findOne({ phone: normalizedPhone });
    console.log('[LOGIN] Student found:', Boolean(student));

    if (!student) {
      return res.status(401).json({ error: 'No student found with that phone number' });
    }

    // TEMPORARY: Skip password verification entirely
    console.log('[LOGIN] Skipping password verification (TEMPORARY)');

    // Create session tokens
    console.log('[LOGIN] Creating tokens...');
    console.log('[LOGIN] Student ID:', student._id);
    console.log('[LOGIN] About to call createPortalTokens...');
    const tokens = await createPortalTokens(student._id);
    console.log('[LOGIN] Tokens created successfully');
    
    // Set cookies
    const cookies = buildAuthCookies(tokens);
    res.setHeader('Set-Cookie', cookies);

    // Prepare response payload
    const payload = buildPortalStudentPayload(student);
    const allowAdmin = canAccessAdminTools(student);
    
    const meta = {
      has_custom_password: Boolean(student.portal_password_hash),
      used_default_password: !student.portal_password_hash && password === getPortalPassword(),
      can_access_admin: allowAdmin,
      admin_shortcuts: allowAdmin ? ADMIN_SHORTCUTS : []
    };

    console.log('[LOGIN] Success, returning response');
    return res.status(200).json({
      student: payload,
      meta
    });

  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    // Ensure we always return a JSON response
    if (!res.headersSent) {
        return res.status(500).json({ error: error.message || 'Internal server error during login' });
    }
  }
}
