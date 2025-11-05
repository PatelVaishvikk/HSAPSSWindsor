import crypto from 'crypto';
import Student from '../models/Student.js';
import { getPortalPassword } from './studentPortalUtils.js';

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
    return bcrypt.compare(candidate, storedHash);
  } catch (error) {
    console.warn('bcryptjs is unavailable; unable to verify legacy password hashes.');
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
  if (storedHash.startsWith('$2')) {
    return tryCompareBcrypt(storedHash, candidate);
  }
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

export async function authenticateStudentFromRequest(req) {
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
