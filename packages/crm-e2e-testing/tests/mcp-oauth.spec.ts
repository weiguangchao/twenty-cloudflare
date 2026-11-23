import { createHash, randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { LoginPage } from '../lib/pom/loginPage';

test('authorizes an MCP client after login, executes CRM tools and revokes its connection', async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin;
  const redirectUri = `${origin}/mcp-test-callback`;
  const registered = await page.request.post('/oauth/register', {
    data: {
      client_name: 'E2E MCP client',
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: 'none',
    },
  });
  expect(registered.status()).toBe(201);
  const { client_id: clientId } = await registered.json();
  const verifier = randomBytes(32).toString('base64url');
  const resource = `${origin}/mcp/v1`;
  const parameters = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
    resource,
    scope: 'crm',
    state: 'e2e-state',
  });
  await page.route('**/mcp-test-callback?**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>Connected</p>' }),
  );
  const consent = await page.goto(`/oauth/authorize?${parameters}`);
  expect(consent?.headers()['content-security-policy']).toContain(
    "frame-ancestors 'none'",
  );
  expect(consent?.headers()['x-frame-options']).toBe('DENY');
  const entry = await page.request.get('/welcome');
  expect(entry.headers()['content-security-policy']).toContain(
    "frame-ancestors 'none'",
  );
  await expect(
    page.getByRole('button', { name: 'Authorize', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('E2E MCP client', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Workspace: Worker CRM', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'run_results/mcp-consent.png',
    fullPage: true,
  });

  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const loginPage = new LoginPage(page);
  await loginPage.clickLoginWithEmailIfVisible();
  await loginPage.typeEmail(
    process.env.DEFAULT_LOGIN ?? 'crm-e2e@example.test',
  );
  await loginPage.clickContinueButton();
  await loginPage.typePassword(
    process.env.DEFAULT_PASSWORD ?? 'E2e-test-password-2026!',
  );
  await loginPage.clickSignInButton();
  await expect(
    page.getByRole('button', { name: 'Authorize', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Authorize', exact: true }).click();
  await page.waitForURL('**/mcp-test-callback?**');
  const callback = new URL(page.url());
  expect(callback.searchParams.get('state')).toBe('e2e-state');
  const exchanged = await page.request.post('/oauth/token', {
    form: {
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code: callback.searchParams.get('code')!,
      code_verifier: verifier,
      resource,
    },
  });
  expect(exchanged.status()).toBe(200);
  const { access_token: accessToken, refresh_token: refreshToken } =
    await exchanged.json();
  const call = (method: string, params?: Record<string, unknown>) =>
    page.request.post('/mcp/v1', {
      headers: { authorization: `Bearer ${accessToken}` },
      data: { jsonrpc: '2.0', id: 1, method, params },
    });
  expect((await call('tools/list')).status()).toBe(200);
  const created = await (
    await call('tools/call', {
      name: 'create_one_company',
      arguments: { name: 'OAuth E2E company' },
    })
  ).json();
  expect(created.result.isError).toBe(false);
  expect(created.result.structuredContent.record.createdBy).toMatchObject({
    source: 'AGENT',
    name: 'Ada Lovelace',
  });
  const refreshed = await page.request.post('/oauth/token', {
    form: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      resource,
    },
  });
  expect(refreshed.status()).toBe(200);
  await page.goto('/settings/profile');
  await expect(
    page.getByText('MCP connections', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('E2E MCP client', { exact: true })).toBeVisible();
  await page
    .getByText('MCP connections', { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'run_results/mcp-connections.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Revoke E2E MCP client' }).click();
  await expect(page.getByText('E2E MCP client', { exact: true })).toHaveCount(
    0,
  );
  expect((await call('ping')).status()).toBe(401);
});
