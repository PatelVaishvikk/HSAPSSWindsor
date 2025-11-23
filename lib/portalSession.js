const ACCESS_COOKIE_NAME = 'hsapss_portal';
const REFRESH_COOKIE_NAME = 'hsapss_portal_refresh';
const ACCESS_TOKEN_TTL_SECONDS = 60 * 20; // 20 minutes
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const JWT_HEADER_B64 = base64UrlEncode(
  JSON.stringify({ alg: 'HS256', typ: 'JWT' })
);
const DEFAULT_SECRET = 'hsapss-portal-dev-secret';
let cachedCryptoKey = null;

function getSecret() {
  const secret =
    process.env.PORTAL_JWT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    DEFAULT_SECRET;
  return secret;
}

function ensureCrypto() {
  if (globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto;
  }
  throw new Error(
    'WebCrypto is unavailable; upgrade to a runtime that supports crypto.subtle'
  );
}

async function getHmacKey() {
  if (cachedCryptoKey) {
    return cachedCryptoKey;
  }
  const cryptoInstance = ensureCrypto();
  cachedCryptoKey = await cryptoInstance.subtle.importKey(
    'raw',
    textEncoder.encode(getSecret()),
    {
      name: 'HMAC',
      hash: 'SHA-256'
    },
    false,
    ['sign', 'verify']
  );
  return cachedCryptoKey;
}

function base64UrlEncode(value) {
  let binary = '';
  let bytes;
  if (typeof value === 'string') {
    bytes = textEncoder.encode(value);
  } else if (value instanceof ArrayBuffer) {
    bytes = new Uint8Array(value);
  } else if (value instanceof Uint8Array) {
    bytes = value;
  } else {
    throw new Error('Unable to base64url encode value');
  }
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecodeToBytes(value) {
  if (!value) {
    return new Uint8Array();
  }
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded =
    normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary =
    typeof atob === 'function'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecodeToString(value) {
  const bytes = base64UrlDecodeToBytes(value);
  return textDecoder.decode(bytes);
}

function randomSessionId() {
  const cryptoInstance = ensureCrypto();
  const bytes = new Uint8Array(16);
  cryptoInstance.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function signToken(payload, ttlSeconds) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const bodyB64 = base64UrlEncode(
    JSON.stringify({
      ...payload,
      iat: issuedAt,
      exp: issuedAt + ttlSeconds
    })
  );
  const unsigned = `${JWT_HEADER_B64}.${bodyB64}`;
  const key = await getHmacKey();
  const signature = await ensureCrypto().subtle.sign(
    'HMAC',
    key,
    textEncoder.encode(unsigned)
  );
  const signatureB64 = base64UrlEncode(signature);
  return `${unsigned}.${signatureB64}`;
}

async function decodeToken(token, expectedType) {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing' };
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'malformed' };
  }
  const [headerPart, payloadPart, signaturePart] = parts;
  if (headerPart !== JWT_HEADER_B64) {
    return { valid: false, reason: 'header' };
  }
  const unsigned = `${headerPart}.${payloadPart}`;
  let payload;
  try {
    const key = await getHmacKey();
    const verified = await ensureCrypto().subtle.verify(
      'HMAC',
      key,
      base64UrlDecodeToBytes(signaturePart),
      textEncoder.encode(unsigned)
    );
    if (!verified) {
      return { valid: false, reason: 'signature' };
    }
    payload = JSON.parse(base64UrlDecodeToString(payloadPart));
  } catch (error) {
    return { valid: false, reason: 'invalid', error };
  }

  if (expectedType && payload.type !== expectedType) {
    return { valid: false, reason: 'type', payload };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSeconds) {
    return { valid: false, reason: 'expired', payload };
  }

  return { valid: true, payload };
}

export async function createPortalTokens(studentId) {
  const sessionId = randomSessionId();
  const basePayload = {
    sub: studentId.toString(),
    sid: sessionId
  };
  const accessToken = await signToken(
    { ...basePayload, type: 'access' },
    ACCESS_TOKEN_TTL_SECONDS
  );
  const refreshToken = await signToken(
    { ...basePayload, type: 'refresh' },
    REFRESH_TOKEN_TTL_SECONDS
  );
  return { accessToken, refreshToken, sessionId };
}

export async function verifyAccessToken(token) {
  return decodeToken(token, 'access');
}

export async function verifyRefreshToken(token) {
  return decodeToken(token, 'refresh');
}

export function parseCookies(cookieHeader = '') {
  if (!cookieHeader) {
    return {};
  }
  return cookieHeader.split(';').reduce((acc, segment) => {
    const [name, ...rest] = segment.split('=');
    if (!name) {
      return acc;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return acc;
    }
    acc[trimmedName] = decodeURIComponent(rest.join('=').trim());
    return acc;
  }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  parts.push(`Path=${options.path || '/'}`);
  if (options.httpOnly) {
    parts.push('HttpOnly');
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function isProd() {
  return process.env.NODE_ENV === 'production';
}

export function buildAuthCookies({ accessToken, refreshToken }) {
  const now = new Date();
  const accessCookie = serializeCookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProd(),
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
    path: '/'
  });
  const refreshCookie = serializeCookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProd(),
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
    path: '/'
  });
  return [accessCookie, refreshCookie];
}

export function buildClearAuthCookies() {
  const expires = new Date(0);
  return [
    serializeCookie(ACCESS_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'Lax',
      secure: isProd(),
      path: '/',
      expires
    }),
    serializeCookie(REFRESH_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'Lax',
      secure: isProd(),
      path: '/',
      expires
    })
  ];
}

export {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS
};
