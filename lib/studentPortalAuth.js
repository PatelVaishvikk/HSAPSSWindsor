import crypto from 'crypto';
import Student from '../models/Student.js';
import { getPortalPassword } from './studentPortalUtils.js';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAuthCookies,
  buildClearAuthCookies,
  createPortalTokens,
  parseCookies,
  verifyAccessToken,
  verifyRefreshToken
} from './portalSession.js';

const sanitizeSecret = (value) => (typeof value === 'string' ? value : '');

const SCRYPT_PREFIX = 's1:';
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_BYTES = 16;

const encodeBuffer = (buffer) => buffer.toString('base64');
const decodeBuffer = (value) => Buffer.from(value, 'base64');

const deriveScryptKey = (secret, saltBuffer) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(secret, saltBuffer, SCRYPT_KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivedKey);
      }
    });
  });

async function hashWithScrypt(secret) {
  const salt = crypto.randomBytes(SCRYPT_SALT_BYTES);
  const derived = await deriveScryptKey(secret, salt);
  return `${SCRYPT_PREFIX}${encodeBuffer(salt)}:${encodeBuffer(derived)}`;
}

async function verifyScryptHash(storedHash, candidate) {
  const [, encodedSalt, encodedDerived] = storedHash.split(':');
  if (!encodedSalt || !encodedDerived) {
    return false;
  }
  const salt = decodeBuffer(encodedSalt);
  const expected = decodeBuffer(encodedDerived);
  try {
    const derived = await deriveScryptKey(candidate, salt);
    return crypto.timingSafeEqual(derived, expected);
  } catch (error) {
    return false;
  }
}

async function tryCompareBcrypt(storedHash, candidate) {
  try {
    const bcryptModule = await import('bcryptjs');
    const bcrypt = bcryptModule.default || bcryptModule;
    if (!bcrypt || typeof bcrypt.compare !== 'function') {
      return false;
    }
    
    // Add timeout for bcrypt comparison
    const comparePromise = bcrypt.compare(candidate, storedHash);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('bcrypt timeout')), 3000)
    );
    
    return await Promise.race([comparePromise, timeoutPromise]);
  } catch (error) {
    if (error.message === 'bcrypt timeout') {
      console.warn('bcrypt comparison timed out');
    } else {
      console.warn('bcryptjs is unavailable; unable to verify legacy password hashes.');
    }
    return false;
  }
}

async function comparePortalHash(storedHash, candidate) {
  if (!storedHash) {
    return false;
  }
  if (storedHash.startsWith(SCRYPT_PREFIX)) {
    return verifyScryptHash(storedHash, candidate);
  }
  // Bcrypt support removed due to hanging issues
  // If you have a bcrypt hash, please reset your password
  console.warn('[AUTH] Unsupported password hash format. Please reset your password.');
  return false;
}

export async function hashPortalPassword(password) {
  const candidate = sanitizeSecret(password).trim();
  if (!candidate) {
    throw new Error('Password must be a non-empty string');
  }
  return hashWithScrypt(candidate);
}

export async function verifyStudentPortalSecret(studentDoc, candidateSecret) {
  const secret = sanitizeSecret(candidateSecret);
  if (!studentDoc || !secret) {
    return false;
  }

  if (studentDoc.portal_password_hash) {
    return comparePortalHash(studentDoc.portal_password_hash, secret);
  }

  return secret === getPortalPassword();
}

export function extractPortalAuth(req) {
  const headers = req.headers || {};
  const headerId = sanitizeSecret(headers['x-student-id']).trim();
  const headerSecret = sanitizeSecret(headers['x-portal-secret']);
  const body = req.body || {};
  const query = req.query || {};

  const studentId =
    headerId ||
    sanitizeSecret(body.studentId || body.student_id || query.studentId || query.student_id).trim();

  const secret =
    headerSecret ||
    sanitizeSecret(body.password || body.secret || query.password || query.secret);

  return { studentId, secret: secret.trim() };
}

export async function authenticateStudentFromRequest(req, res) {
  // 1. Try Cookie Auth
  if (res) {
    const session = await getPortalSessionFromRequest(req, res);
    if (session?.student) {
      return { student: session.student };
    }
  }

  // 2. Fallback to Header/Body Auth
  const { studentId, secret } = extractPortalAuth(req);
  if (!studentId || !secret) {
    return { error: 'Missing credentials', status: 401 };
  }

  const student = await Student.findById(studentId);
  if (!student) {
    return { error: 'Student not found', status: 404 };
  }

  const isValid = await verifyStudentPortalSecret(student, secret);
  if (!isValid) {
    return { error: 'Invalid credentials', status: 401 };
  }

  return { student, secret };
}

export async function authenticateStudentBySecret(studentId, secret) {
  if (!studentId || !secret) {
    return null;
  }
  const student = await Student.findById(studentId);
  if (!student) {
    return null;
  }

  const isValid = await verifyStudentPortalSecret(student, secret);
  if (!isValid) {
    return null;
  }

  return student;
}

const appendCookies = (res, cookieValues = []) => {
  if (!res || typeof res.setHeader !== 'function' || cookieValues.length === 0) {
    return;
  }
  if (typeof res.getHeader === 'function') {
    const existing = res.getHeader('Set-Cookie');
    if (existing) {
      const normalized = Array.isArray(existing) ? existing : [existing];
      res.setHeader('Set-Cookie', [...normalized, ...cookieValues]);
      return;
    }
  }
  res.setHeader('Set-Cookie', cookieValues);
};

const findStudentById = async (studentId) => {
  if (!studentId) {
    return null;
  }
  try {
    return await Student.findById(studentId);
  } catch (error) {
    return null;
  }
};

export async function getPortalSessionFromRequest(req, res) {
  const cookies = parseCookies(req?.headers?.cookie || '');
  const accessToken = cookies[ACCESS_COOKIE_NAME];
  const refreshToken = cookies[REFRESH_COOKIE_NAME];

  if (accessToken) {
    const verification = await verifyAccessToken(accessToken);
    if (verification.valid && verification.payload?.sub) {
      const student = await findStudentById(verification.payload.sub);
      if (student) {
        return { student, source: 'access' };
      }
    }
  }

  if (refreshToken) {
    const refreshResult = await verifyRefreshToken(refreshToken);
    
    if (refreshResult.valid && refreshResult.payload?.sub) {
      const student = await findStudentById(refreshResult.payload.sub);
      if (student) {
        const tokens = await createPortalTokens(student._id);
        appendCookies(res, buildAuthCookies(tokens));
        return { student, source: 'refresh' };
      } else {
        // Student not found
      }
    } else if (refreshResult.reason && res) {
      appendCookies(res, buildClearAuthCookies());
    }
  }

  return null;
}
