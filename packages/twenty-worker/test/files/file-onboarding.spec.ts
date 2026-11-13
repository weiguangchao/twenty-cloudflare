import { SELF } from 'cloudflare:test';
import { beforeAll, expect, it } from 'vitest';

import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  setupCoreTestDatabase,
  signup,
} from '../utils/auth-test.util';

beforeAll(async () => {
  await setupCoreTestDatabase();
  await clearCoreTestDatabase();
});

it('lets the workspace creator upload a logo before session exchange and activation', async () => {
  const connection = client();
  await signup(connection);
  const second = client();
  await signup(second);
  const creation = await connection.request<{
    signUpInNewWorkspace: {
      workspace: { id: string };
      loginToken: { token: string };
    };
  }>(
    'mutation{signUpInNewWorkspace(input:{displayName:"Logo onboarding"}){workspace{id} loginToken{token}}}',
  );
  expect(creation.result.errors).toBeUndefined();
  const workspace = creation.result.data!.signUpInNewWorkspace;
  const content =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20" fill="red"/></svg>';
  const created = await connection.request<{
    createNewWorkspaceLogoUpload: { fileId: string; uploadUrl: string };
  }>(
    'mutation($workspaceId:String!, $size:Float!){createNewWorkspaceLogoUpload(workspaceId:$workspaceId,filename:"logo.svg",size:$size){fileId uploadUrl}}',
    { workspaceId: workspace.workspace.id, size: content.length },
  );
  expect(created.result.errors).toBeUndefined();
  const target = created.result.data!.createNewWorkspaceLogoUpload;
  expect(
    (await SELF.fetch(target.uploadUrl, { method: 'PUT', body: content }))
      .status,
  ).toBe(204);
  const completed = await connection.request<{
    completeNewWorkspaceLogoUpload: { url: string };
  }>(
    'mutation($workspaceId:String!,$fileId:String!){completeNewWorkspaceLogoUpload(workspaceId:$workspaceId,fileId:$fileId){url}}',
    { workspaceId: workspace.workspace.id, fileId: target.fileId },
  );
  expect(completed.result.errors).toBeUndefined();
  const file = completed.result.data!.completeNewWorkspaceLogoUpload;
  expect((await SELF.fetch(file.url)).status).toBe(200);
  const forbidden = await second.request(
    'mutation($workspaceId:String!){createNewWorkspaceLogoUpload(workspaceId:$workspaceId,filename:"logo.png",size:100){fileId}}',
    { workspaceId: workspace.workspace.id },
  );
  expect(forbidden.result.errors![0].extensions.code).toBe('FORBIDDEN');
  const exchange = await connection.request(
    'mutation($token:String!,$origin:String!){getAuthTokensFromLoginToken(loginToken:$token,origin:$origin){tokens{accessOrWorkspaceAgnosticToken{token}}}}',
    { token: workspace.loginToken.token, origin: ORIGIN },
  );
  expect(exchange.result.errors).toBeUndefined();
  const activated = await connection.request(
    'mutation{activateWorkspace(data:{}){id}}',
  );
  expect(activated.result.errors).toBeUndefined();
  const current = await connection.request<{
    currentUser: { currentWorkspace: { logo: string } };
  }>('{currentUser{currentWorkspace{logo}}}');
  expect(
    new URL(current.result.data!.currentUser.currentWorkspace.logo).pathname,
  ).toBe(new URL(file.url).pathname);
});
