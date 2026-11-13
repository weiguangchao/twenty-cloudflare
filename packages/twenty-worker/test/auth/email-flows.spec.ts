import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';

import { createMetadataContext } from '@/metadata-api/create-metadata-context.util';
import { handleMetadataRequest } from '@/metadata-api/metadata-api';
import {
  emailPasswordResetLink,
  resetPassword,
  sendVerificationEmail,
  verifyEmailAction,
} from '@/auth/email-action.service';
import {
  acceptWorkspaceInvitation,
  invitationFromToken,
  sendWorkspaceInvitations,
} from '@/auth/workspace-invitation.service';
import {
  deliverEmail,
  dispatchPendingEmails,
  enqueueEmail,
} from '@/emails/email-delivery.service';
import { type EmailJob } from '@/emails/types/email-job.type';
import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  PASSWORD,
  prepareWorkspace,
  setupCoreTestDatabase,
  user,
} from '../utils/auth-test.util';

const sending = vi
  .fn<SendEmail['send']>()
  .mockResolvedValue({ messageId: 'sent' });
const configuration = {
  ...env,
  EMAIL_FROM: 'twenty@example.com',
  EMAIL: { send: sending },
} as Env;
const connection = client();
const context = () =>
  createMetadataContext(
    configuration,
    new Request(`${ORIGIN}/metadata`, {
      headers: { cookie: connection.cookie, 'x-twenty-session-cookie': '1' },
    }),
    new Headers(),
  );
let account: Awaited<ReturnType<typeof prepareWorkspace>>;

beforeAll(setupCoreTestDatabase);
beforeEach(async () => {
  await clearCoreTestDatabase();
  sending.mockReset().mockResolvedValue({ messageId: 'sent' });
  account = await prepareWorkspace(connection);
});

const latestJob = async () => {
  const row = await env.CORE_DB.prepare(
    'SELECT "id", "payload" FROM "emailDelivery" ORDER BY rowid DESC LIMIT 1',
  ).first<{ id: string; payload: string }>();
  return { id: row!.id, job: JSON.parse(row!.payload) as EmailJob };
};

it('requires email verification before workspace setup and exchanges the verified link over HTTP', async () => {
  await clearCoreTestDatabase();
  const configured = { ...configuration, EMAIL_VERIFICATION_REQUIRED: 'true' };
  const email = 'verification-required@example.com';
  const request = (
    query: string,
    variables: Record<string, unknown> = {},
    cookie = '',
  ) =>
    handleMetadataRequest(
      new Request(`${ORIGIN}/metadata`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: ORIGIN,
          'x-twenty-session-cookie': '1',
          cookie,
        },
        body: JSON.stringify({ query, variables }),
      }),
      configured,
    );
  const registered = await request(
    'mutation($email: String!, $password: String!) {signUp(email: $email, password: $password) {tokens {accessOrWorkspaceAgnosticToken {token}}}}',
    { email, password: PASSWORD },
  );
  expect(await registered.json()).toHaveProperty('data.signUp.tokens');
  const cookie = registered.headers.getSetCookie()[0].split(';')[0];
  const denied = await request(
    'mutation {signUpInNewWorkspace(input: {displayName: "Verify first"}) {workspace {id}}}',
    {},
    cookie,
  );
  expect(await denied.json()).toMatchObject({
    errors: [
      { extensions: { code: 'FORBIDDEN', subCode: 'EMAIL_NOT_VERIFIED' } },
    ],
  });
  const token = new URL((await latestJob()).job.link).searchParams.get(
    'emailVerificationToken',
  )!;
  const verified = await request(
    'mutation($token: String!, $email: String!) {verifyEmailAndGetWorkspaceAgnosticToken(emailVerificationToken: $token, email: $email) {tokens {accessOrWorkspaceAgnosticToken {token}}}}',
    { token, email },
  );
  expect(await verified.json()).toHaveProperty(
    'data.verifyEmailAndGetWorkspaceAgnosticToken.tokens',
  );
  const newCookie = verified.headers.getSetCookie()[0].split(';')[0];
  const created = await request(
    'mutation {signUpInNewWorkspace(input: {displayName: "Verified"}) {workspace {id}}}',
    {},
    newCookie,
  );
  expect(await created.json()).toHaveProperty(
    'data.signUpInNewWorkspace.workspace.id',
  );
});

it('resets a password once and revokes existing sessions without revealing unknown accounts', async () => {
  expect(
    await emailPasswordResetLink(context(), 'missing@example.com'),
  ).toEqual({ success: true });
  expect(
    await env.CORE_DB.prepare('SELECT 1 FROM "emailDelivery"').first(),
  ).toBeNull();
  await emailPasswordResetLink(context(), account.email);
  const { job } = await latestJob();
  const token = new URL(job.link).pathname.split('/').at(-1)!;
  await resetPassword(context(), token, 'UpdatedPassword123!');
  await expect(resetPassword(context(), token, PASSWORD)).rejects.toMatchObject(
    { extensions: { code: 'UNAUTHENTICATED' } },
  );
  expect(
    (await connection.request('query { currentUser {id} }')).result.errors?.[0]
      .extensions.code,
  ).toBe('UNAUTHENTICATED');
  const login = client();
  expect(
    (
      await login.request(
        'mutation($email: String!) { signIn(email: $email, password: "UpdatedPassword123!") {tokens {accessOrWorkspaceAgnosticToken {token}}} }',
        { email: account.email },
      )
    ).result.errors,
  ).toBeUndefined();
});

it('verifies matching email links once and expires old links when resending', async () => {
  const administrator = await user(connection);
  const owner = (await context().store.userById(administrator.id))!;
  await env.CORE_DB.prepare(
    'UPDATE "user" SET "isEmailVerified" = 0 WHERE "id" = ?',
  )
    .bind(owner.id)
    .run();
  await sendVerificationEmail(context(), owner);
  const first = new URL((await latestJob()).job.link).searchParams.get(
    'emailVerificationToken',
  )!;
  await sendVerificationEmail(context(), owner);
  const second = new URL((await latestJob()).job.link).searchParams.get(
    'emailVerificationToken',
  )!;
  await expect(
    verifyEmailAction(context(), first, owner.email),
  ).rejects.toBeDefined();
  await expect(
    verifyEmailAction(context(), second, 'wrong@example.com'),
  ).rejects.toBeDefined();
  expect(
    (await verifyEmailAction(context(), second, owner.email)).isEmailVerified,
  ).toBe(1);
  await expect(
    verifyEmailAction(context(), second, owner.email),
  ).rejects.toBeDefined();
});

it('sends private invitations without requiring a public link and assigns the requested role', async () => {
  const role = await connection.request<{ createOneRole: { id: string } }>(
    'mutation {createOneRole(createRoleInput: {label: "Invited reader", canReadAllObjectRecords: true}) {id}}',
  );
  const roleId = role.result.data!.createOneRole.id;
  const email = 'invited@example.com';
  const invited = await sendWorkspaceInvitations(context(), [email], roleId);
  expect(invited.result[0]).toMatchObject({ email, roleId });
  const token = new URL((await latestJob()).job.link).searchParams.get(
    'inviteToken',
  )!;
  await expect(
    acceptWorkspaceInvitation(context(), {
      email: 'wrong@example.com',
      password: PASSWORD,
      workspacePersonalInviteToken: token,
    }),
  ).rejects.toBeDefined();
  await acceptWorkspaceInvitation(context(), {
    email,
    password: PASSWORD,
    workspacePersonalInviteToken: token,
  });
  const newUser = (await context().store.userByEmail(email))!;
  const membership = (await context().store.membership(
    newUser.id,
    account.workspaceId,
  ))!;
  const data = await context()
    .workspace(account.workspaceId)
    .getWorkspaceAuthData({
      workspaceMemberId: membership.workspaceMemberId,
      userWorkspaceId: membership.id,
    });
  expect(data.permissions.roleIds).toEqual([roleId]);
  await expect(invitationFromToken(context(), token)).rejects.toBeDefined();
});

it('renders and delivers queued email once, then removes the stored link', async () => {
  await emailPasswordResetLink(context(), account.email);
  const { id } = await latestJob();
  await deliverEmail(configuration, id);
  await deliverEmail(configuration, id);
  expect(sending).toHaveBeenCalledTimes(1);
  expect(sending.mock.calls[0][0]).toMatchObject({
    from: 'twenty@example.com',
    to: account.email,
    html: expect.stringContaining('/reset-password/'),
    text: expect.stringContaining('/reset-password/'),
  });
  expect(
    await env.CORE_DB.prepare(
      'SELECT "payload", "status" FROM "emailDelivery" WHERE "id" = ?',
    )
      .bind(id)
      .first(),
  ).toEqual({ payload: '{}', status: 'sent' });
});

it('persists failed deliveries for Queue and scheduled retries', async () => {
  await emailPasswordResetLink(context(), account.email);
  const { id } = await latestJob();
  sending.mockRejectedValueOnce(new Error('service unavailable'));
  await expect(deliverEmail(configuration, id)).rejects.toThrow(
    'Transactional email delivery failed',
  );
  expect(
    await env.CORE_DB.prepare(
      'SELECT "status", "attempts" FROM "emailDelivery" WHERE "id" = ?',
    )
      .bind(id)
      .first(),
  ).toEqual({ status: 'pending', attempts: 1 });
  await env.CORE_DB.prepare(
    'UPDATE "emailDelivery" SET "availableAt" = 0 WHERE "id" = ?',
  )
    .bind(id)
    .run();
  await dispatchPendingEmails(configuration);
  await deliverEmail(configuration, id);
  expect(sending).toHaveBeenCalledTimes(2);
});

it('rejects disabled email configuration and expired action tokens', async () => {
  await expect(
    enqueueEmail(
      { ...configuration, EMAIL_FROM: undefined },
      {
        template: 'email-verification',
        to: account.email,
        locale: 'en',
        link: ORIGIN,
      },
      Date.now() + 1000,
    ),
  ).rejects.toMatchObject({ extensions: { code: 'NOT_IMPLEMENTED' } });
  await emailPasswordResetLink(context(), account.email);
  const token = new URL((await latestJob()).job.link).pathname
    .split('/')
    .at(-1)!;
  await env.CORE_DB.prepare('UPDATE "appToken" SET "expiresAt" = ?')
    .bind(new Date(0).toISOString())
    .run();
  await expect(resetPassword(context(), token, PASSWORD)).rejects.toBeDefined();
});
