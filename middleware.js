import { NextResponse } from 'next/server';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAuthCookies,
  createPortalTokens,
  parseCookies,
  verifyAccessToken,
  verifyRefreshToken
} from './lib/portalSession.js';

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/yuvak-details',
  '/api/student-portal/login',
  '/api/student-portal/register',
  '/api/student-portal/logout',
  '/api/auth',
  '/api/notifications/birthdays'
]);

const ADMIN_MANAGED_PATHS = new Set([
  '/add-student',
  '/add-yuvak',
  '/attendance',
  '/call-logs',
  '/full-student-list',
  '/grocery',
  '/moved-out-students',
  '/students-table'
]);

const PUBLIC_PREFIXES = ['/api/auth/', '/_next', '/favicon.ico', '/public', '/api/health', '/student-portal'];

const isAdminPath = (pathname = '') => pathname === '/admin' || pathname.startsWith('/admin/');

const MATCHER = '/((?!_next|.*\\..*|favicon.ico).*)';

const isPublicPath = (pathname) => {
  if (isAdminPath(pathname)) {
    return true;
  }
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }
  if (ADMIN_MANAGED_PATHS.has(pathname)) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
};

function appendCookies(response, cookieHeaders = []) {
  cookieHeaders.forEach((cookie) => {
    response.headers.append('Set-Cookie', cookie);
  });
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  console.log('[MIDDLEWARE] Request:', pathname);

  if (pathname.startsWith('/api/')) {
    console.log('[MIDDLEWARE] API route, passing through');
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const cookies = parseCookies(req.headers.get('cookie') || '');
  const accessToken = cookies[ACCESS_COOKIE_NAME];

  if (accessToken) {
    const verification = await verifyAccessToken(accessToken);
    if (verification.valid) {
      return NextResponse.next();
    }
  }

  const refreshToken = cookies[REFRESH_COOKIE_NAME];
  if (refreshToken) {
    const refreshResult = await verifyRefreshToken(refreshToken);
    if (refreshResult.valid && refreshResult.payload?.sub) {
      const tokens = await createPortalTokens(refreshResult.payload.sub);
      const response = NextResponse.next();
      appendCookies(response, buildAuthCookies(tokens));
      return response;
    }
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (starts with /api/)
     * - _next (Next.js internals)
     * - static files (contains a dot)
     * - favicon.ico
     */
    '/((?!api/|_next|.*\\..*|favicon.ico).*)'
  ]
};
