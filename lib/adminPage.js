import { getAdminSessionFromRequest, isAdminRequest } from './adminAuth.js';

const buildRedirect = (destination) => ({
  redirect: {
    destination,
    permanent: false,
  },
});

export async function requireAdminPage(ctx) {
  if (!ctx?.req) {
    return buildRedirect('/admin/login');
  }
  if (isAdminRequest(ctx.req)) {
    return { props: {} };
  }
  const target = ctx.resolvedUrl || '/';
  const search = target && target !== '/' ? `?redirect=${encodeURIComponent(target)}` : '';
  return buildRedirect(`/admin/login${search}`);
}

export function getAdminSessionCookie(ctx) {
  return getAdminSessionFromRequest(ctx?.req);
}
