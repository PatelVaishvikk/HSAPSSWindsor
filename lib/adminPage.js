import { getAdminSessionFromRequest, isAdminRequest } from './adminAuth.js';

const buildRedirect = (destination) => ({
  redirect: {
    destination,
    permanent: false,
  },
});

import { canAccessAdminTools } from './portalAdmin.js';
import { getStudentFromRequest } from './studentPortalUtils.js';

export async function requireAdminPage(ctx) {
  if (!ctx?.req) {
    return buildRedirect('/admin/login');
  }

  // 1. Portal Admin
  const student = await getStudentFromRequest(ctx.req);
  if (student && canAccessAdminTools(student)) {
     return { props: {} };
  }

  // 2. Global Admin
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
