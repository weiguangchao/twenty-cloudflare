import { extractSessionCookie } from '@/auth/session.service';

export const cookieSessionOriginError = (request: Request) => {
  const bearer = /^Bearer\s+\S+$/i.test(
    request.headers.get('authorization') ?? '',
  );
  if (
    ['GET', 'HEAD', 'OPTIONS'].includes(request.method) ||
    bearer ||
    !extractSessionCookie(request) ||
    request.headers.get('origin') === new URL(request.url).origin
  )
    return undefined;

  return Response.json(
    {
      statusCode: 403,
      messages: [
        'Request origin is not allowed for cookie-authenticated requests',
      ],
      error: 'CSRF_ORIGIN_MISMATCH',
    },
    { status: 403 },
  );
};
