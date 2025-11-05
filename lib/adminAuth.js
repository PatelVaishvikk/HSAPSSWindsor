import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'hsapss-session-secret';

const hashWithSecret = (value) =>
  crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(String(value)).digest('hex');

const safeEqual = (a = '', b = '') => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

export function ensureAdminConfigured() {
  if (!ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD environment variable is not set');
  }
}

export function hashAdminPassword(candidate) {
  return hashWithSecret(candidate);
}

export function getAdminSessionToken() {
  ensureAdminConfigured();
  return hashWithSecret(`${ADMIN_PASSWORD}:session`);
}

export function createAdminSessionCookie() {
  const token = getAdminSessionToken();
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function createAdminLogoutCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function verifyAdminPassword(candidate) {
  if (!ADMIN_PASSWORD) {
    return false;
  }
  const candidateHash = hashAdminPassword(candidate);
  const passwordHash = hashAdminPassword(ADMIN_PASSWORD);
  return safeEqual(candidateHash, passwordHash);
}

const parseCookies = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, ...rest] = pair.split('=');
      if (!key) {
        return acc;
      }
      acc[key] = rest.join('=');
      return acc;
    }, {});

export function getAdminSessionFromRequest(req) {
  const cookieHeader =
    (req?.headers && (req.headers.cookie || req.headers.Cookie)) || req?.cookies;
  const cookies =
    typeof cookieHeader === 'string' ? parseCookies(cookieHeader) : cookieHeader || {};
  return cookies?.admin_session || '';
}

export function isAdminRequest(req) {
  const token = getAdminSessionFromRequest(req);
  if (!token) {
    return false;
  }
  try {
    const expected = getAdminSessionToken();
    return safeEqual(token, expected);
  } catch (error) {
    return false;
  }
}
