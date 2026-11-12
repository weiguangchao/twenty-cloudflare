// Auth error codes, login token reuse, cookie session and CSRF behavior.
export const FLOW = 'auth-api';

const ORIGIN = 'http://localhost:3001';

const extractSessionCookie = (setCookieHeader) =>
  setCookieHeader?.match(/(?:__Host-)?twenty-session=[^;]+/)?.[0] ?? null;

export const run = async (client) => {
  const q = client.findCapturedQuery;

  await client.metadata('CheckUserExists', q('CheckUserExists'), {
    email: 'nobody@example.com',
  });

  await client.metadata('SignUp', q('SignUp'), {
    email: 'alice@example.com',
    password: 'AnotherPassword1',
    locale: 'en',
  });

  await client.metadata('SignUp', q('SignUp'), {
    email: 'short@example.com',
    password: 'short',
    locale: 'en',
  });

  await client.metadata(
    'GetLoginTokenFromCredentials',
    q('GetLoginTokenFromCredentials'),
    { email: 'nobody@example.com', password: 'Password123!', origin: ORIGIN },
  );

  const { loginToken } = await client.signIn(
    'alice@example.com',
    'Password123!',
  );

  await client.metadata(
    'getAuthTokensFromLoginToken',
    q('getAuthTokensFromLoginToken'),
    { loginToken, origin: ORIGIN },
  );

  await client.metadata('GetCurrentUser', q('GetCurrentUser'), {});

  client.setAccessToken(null);
  await client.metadata('GetCurrentUser', q('GetCurrentUser'), {});

  client.setAccessToken('not-a-valid-token');
  await client.metadata('GetCurrentUser', q('GetCurrentUser'), {});
  client.setAccessToken(null);

  const cookieLogin = await client.metadata(
    'GetLoginTokenFromCredentials',
    q('GetLoginTokenFromCredentials'),
    { email: 'alice@example.com', password: 'Password123!', origin: ORIGIN },
    { 'x-twenty-session-cookie': '1' },
  );
  const cookieTokens = await client.metadata(
    'getAuthTokensFromLoginToken',
    q('getAuthTokensFromLoginToken'),
    {
      loginToken:
        cookieLogin.json.data.getLoginTokenFromCredentials.loginToken.token,
      origin: ORIGIN,
    },
    { 'x-twenty-session-cookie': '1' },
  );
  const sessionCookie = extractSessionCookie(cookieTokens.setCookie);

  if (!sessionCookie) {
    throw new Error('No session cookie returned');
  }

  await client.metadata(
    'GetCurrentUser',
    q('GetCurrentUser'),
    {},
    {
      cookie: sessionCookie,
    },
  );

  await client.metadata(
    'GetCurrentUser',
    q('GetCurrentUser'),
    {},
    {
      cookie: sessionCookie,
      'x-twenty-session-cookie': '1',
    },
  );

  await client.metadata(
    'UpdateWorkspaceMemberSettings',
    q('UpdateWorkspaceMemberSettings'),
    {
      input: {
        workspaceMemberId: 'baa03178-0030-4e0a-b7c8-59312b5d3eaa',
        update: { locale: 'en' },
      },
    },
    {
      cookie: sessionCookie,
      'x-twenty-session-cookie': '1',
      origin: 'https://evil.example.com',
    },
  );

  await client.metadata(
    'UpdateWorkspaceMemberSettings',
    q('UpdateWorkspaceMemberSettings'),
    {
      input: {
        workspaceMemberId: 'baa03178-0030-4e0a-b7c8-59312b5d3eaa',
        update: { locale: 'en' },
      },
    },
    { cookie: sessionCookie, 'x-twenty-session-cookie': '1', origin: null },
  );

  await client.metadata(
    'SignOut',
    q('SignOut'),
    {},
    {
      cookie: sessionCookie,
      'x-twenty-session-cookie': '1',
    },
  );

  await client.metadata(
    'GetCurrentUser',
    q('GetCurrentUser'),
    {},
    {
      cookie: sessionCookie,
      'x-twenty-session-cookie': '1',
    },
  );
};
