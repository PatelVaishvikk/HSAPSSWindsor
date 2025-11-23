import { getPortalSessionFromRequest, parseCookies, verifyAccessToken, verifyRefreshToken } from '../lib/studentPortalAuth';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../lib/portalSession';

export default function DebugAuth({ debugInfo }) {
  return (
    <div className="p-5 font-monospace">
      <h1>Auth Debugger</h1>
      <pre className="bg-light p-3 border rounded">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      <div className="mt-3">
        <a href="/student-portal" className="btn btn-primary">Go to Portal</a>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { req, res } = context;
  const cookies = parseCookies(req.headers.cookie || '');
  const accessCookie = cookies[ACCESS_COOKIE_NAME];
  const refreshCookie = cookies[REFRESH_COOKIE_NAME];
  
  const session = await getPortalSessionFromRequest(req, res);
  
  let accessVerification = { valid: false, reason: 'missing' };
  if (accessCookie) {
    accessVerification = await verifyAccessToken(accessCookie);
  }
  
  let refreshVerification = { valid: false, reason: 'missing' };
  if (refreshCookie) {
    refreshVerification = await verifyRefreshToken(refreshCookie);
  }

  const debugInfo = {
    env: process.env.NODE_ENV,
    cookiesFound: {
      access: !!accessCookie,
      refresh: !!refreshCookie,
      rawLength: req.headers.cookie ? req.headers.cookie.length : 0
    },
    sessionFound: !!session,
    studentId: session?.student?._id || null,
    accessVerification: {
      valid: accessVerification.valid,
      reason: accessVerification.reason,
      expires: accessVerification.payload?.exp ? new Date(accessVerification.payload.exp * 1000).toISOString() : null
    },
    refreshVerification: {
      valid: refreshVerification.valid,
      reason: refreshVerification.reason,
      expires: refreshVerification.payload?.exp ? new Date(refreshVerification.payload.exp * 1000).toISOString() : null
    }
  };

  return {
    props: { debugInfo }
  };
}
