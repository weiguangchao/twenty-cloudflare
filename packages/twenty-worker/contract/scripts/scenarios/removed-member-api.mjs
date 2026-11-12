// What a removed member gets when signing in again.
export const FLOW = 'removed-member-api';

export const run = async (client) => {
  const q = client.findCapturedQuery;

  await client.metadata('CheckUserExists', q('CheckUserExists'), {
    email: 'bob@example.com',
  });
  await client.metadata(
    'GetLoginTokenFromCredentials',
    q('GetLoginTokenFromCredentials'),
    {
      email: 'bob@example.com',
      password: 'Password123!',
      origin: 'http://localhost:3001',
    },
  );
};
