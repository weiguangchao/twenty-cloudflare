import {
  env,
  SELF,
  runInDurableObject,
  createExecutionContext,
  createMessageBatch,
  getQueueResult,
} from 'cloudflare:test';
import { beforeAll, expect, it, vi } from 'vitest';

import { signToken } from '@/auth/token.service';
import { type WorkspaceFile } from '@/files/types/workspace-file.type';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';
import { validateFileContent } from '@/files/validate-file-content.util';
import { WorkspaceFileStore } from '@/files/workspace-file-store';
import { processFileCleanup } from '@/files/cleanup-files.util';
import { createRecordIdentity } from '../utils/record-query-test.util';
import worker from '@/index';

import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  prepareWorkspace,
  setupCoreTestDatabase,
  user,
} from '../utils/auth-test.util';

const connection = client();
const PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1kAAAAASUVORK5CYII=',
  ),
  (value) => value.charCodeAt(0),
);
const CONTENT = 'Proposal draft for Airbnb\n'.repeat(50);
type UploadTarget = {
  fileId: string;
  uploadUrl: string;
  contentType: string;
  expiresAt: string;
  __typename: string;
};
type UploadedFile = {
  id: string;
  path: string;
  size: number;
  url: string;
  createdAt: string;
  __typename: string;
};
let workspaceId: string;
let identity: RecordQueryIdentity;
let attachmentFieldId: string;
let personImageFieldId: string;
let companyId: string;

const metadata = async <TData>(
  query: string,
  variables: Record<string, unknown> = {},
) => {
  const { result } = await connection.request<TData>(query, variables);
  expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
  return result.data!;
};
const records = async <TData>(
  query: string,
  variables: Record<string, unknown> = {},
) => {
  const response = await SELF.fetch(`${ORIGIN}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      cookie: connection.cookie,
      'x-twenty-session-cookie': '1',
    },
    body: JSON.stringify({ query, variables }),
  });
  return response.json() as Promise<{
    data: TData;
    errors?: { extensions: { code: string } }[];
  }>;
};
const create = async (
  filename = 'proposal.txt',
  size = CONTENT.length,
  fileFolder = 'FilesField',
  fieldMetadataId: string | undefined = attachmentFieldId,
) =>
  (
    await metadata<{ createFileUpload: UploadTarget }>(
      'mutation($filename: String!, $size: Float!, $fileFolder: FileFolder!, $fieldMetadataId: String) {createFileUpload(filename: $filename, size: $size, fileFolder: $fileFolder, fieldMetadataId: $fieldMetadataId) {fileId uploadUrl contentType expiresAt __typename}}',
      { filename, size, fileFolder, fieldMetadataId },
    )
  ).createFileUpload;
const put = (target: UploadTarget, body: BodyInit = CONTENT) =>
  SELF.fetch(target.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': target.contentType },
    body,
  });
const complete = async (
  target: UploadTarget,
  operation = 'completeFileUpload',
) =>
  (
    await metadata<Record<string, UploadedFile>>(
      `mutation($id: String!) {${operation}(fileId: $id) {id path size createdAt url __typename}}`,
      { id: target.fileId },
    )
  )[operation];
const upload = async () => {
  const target = await create();
  expect((await put(target)).status).toBe(204);
  return complete(target);
};
const inWorkspace = <TResult>(
  callback: (
    state: DurableObjectState,
    instance: WorkspaceDurableObject,
  ) => TResult | Promise<TResult>,
) =>
  runInDurableObject(
    env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId)),
    (instance: WorkspaceDurableObject, state) => callback(state, instance),
  );

beforeAll(async () => {
  await setupCoreTestDatabase();
  await clearCoreTestDatabase();
  await prepareWorkspace(connection);
  const current = await user(connection);
  workspaceId = current.currentWorkspace!.id;
  identity = {
    userId: current.id,
    userWorkspaceId: current.currentUserWorkspace!.id,
    workspaceMemberId: current.workspaceMember!.id,
  };
  const objects = (
    await metadata<{
      objects: {
        edges: {
          node: {
            nameSingular: string;
            fieldsList: { id: string; name: string }[];
          };
        }[];
      };
    }>(
      '{objects(paging:{first:100}) {edges{node{nameSingular fieldsList{id name}}}}}',
    )
  ).objects.edges.map((edge) => edge.node);
  attachmentFieldId = objects
    .find((object) => object.nameSingular === 'attachment')!
    .fieldsList.find((field) => field.name === 'file')!.id;
  personImageFieldId = objects
    .find((object) => object.nameSingular === 'person')!
    .fieldsList.find((field) => field.name === 'avatarFile')!.id;
  companyId = (
    await records<{ companies: { edges: { node: { id: string } }[] } }>(
      '{companies(first:1){edges{node{id}}}}',
    )
  ).data.companies.edges[0].node.id;
});

it('streams the captured text upload and serves full, ranged, conditional and HEAD downloads', async () => {
  const target = await create();
  expect(target).toMatchObject({
    contentType: 'application/octet-stream',
    __typename: 'FileUploadTarget',
  });
  expect(Date.parse(target.expiresAt)).toBeGreaterThan(Date.now());
  expect((await put(target)).status).toBe(204);
  const file = await complete(target);
  expect(file).toMatchObject({
    id: target.fileId,
    size: 1300,
    __typename: 'FileWithSignedUrl',
  });
  expect(file.path).toMatch(/^files-field\/[^/]+\/[^/]+\.txt$/);
  const downloaded = await SELF.fetch(file.url);
  expect(downloaded.status).toBe(200);
  expect(downloaded.headers.get('content-type')).toBe('text/plain');
  expect(downloaded.headers.get('cache-control')).toContain('private');
  expect(await downloaded.text()).toBe(CONTENT);
  const ranged = await SELF.fetch(file.url, {
    headers: { range: 'bytes=0-99' },
  });
  expect(ranged.status).toBe(206);
  expect(ranged.headers.get('content-range')).toBe('bytes 0-99/1300');
  expect(await ranged.text()).toBe(CONTENT.slice(0, 100));
  expect(
    await (
      await SELF.fetch(file.url, { headers: { range: 'bytes=-9' } })
    ).text(),
  ).toBe(CONTENT.slice(-9));
  expect(
    (await SELF.fetch(file.url, { headers: { range: 'bytes=9999-' } })).status,
  ).toBe(416);
  expect(
    (
      await SELF.fetch(file.url, {
        headers: { 'if-none-match': downloaded.headers.get('etag')! },
      })
    ).status,
  ).toBe(304);
  const head = await SELF.fetch(file.url, { method: 'HEAD' });
  expect(head.headers.get('content-length')).toBe('1300');
  expect(await head.text()).toBe('');
  expect((await complete(target)).id).toBe(file.id);
  expect((await put(target)).status).toBe(409);
  expect(await (await SELF.fetch(file.url)).text()).toBe(CONTENT);
});

it('requires a matching file capability and rejects expired regular file tokens', async () => {
  const file = await upload();
  const url = new URL(file.url);
  expect((await SELF.fetch(`${url.origin}${url.pathname}`)).status).toBe(403);
  expect(
    (await SELF.fetch(`${url.origin}${url.pathname}?token=bad`)).status,
  ).toBe(403);
  expect(
    (await SELF.fetch(file.url.replace(file.id, crypto.randomUUID()))).status,
  ).toBe(403);
  expect(
    (await SELF.fetch(file.url.replace('/files-field/', '/core-picture/')))
      .status,
  ).toBe(403);
  const expired = await signToken(
    env.APP_SECRET,
    'file',
    { sub: workspaceId, workspaceId, fileId: file.id },
    -1,
  );
  expect(
    (await SELF.fetch(`${url.origin}${url.pathname}?token=${expired.token}`))
      .status,
  ).toBe(403);
});

it('rejects oversize and truncated streams, missing or mismatched upload tokens and duplicate transfers', async () => {
  const target = await create('small.txt', 4);
  expect(
    (
      await SELF.fetch(target.uploadUrl.split('?')[0], {
        method: 'PUT',
        body: 'test',
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await SELF.fetch(
        target.uploadUrl.replace(target.fileId, crypto.randomUUID()),
        { method: 'PUT', body: 'test' },
      )
    ).status,
  ).toBe(403);
  expect((await put(target, 'toolong')).status).toBe(413);
  expect((await put(target, 'a')).status).toBe(400);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('123'));
      controller.enqueue(new TextEncoder().encode('456'));
      controller.close();
    },
  });
  expect((await put(target, stream)).status).toBe(413);
  expect((await put(target, 'test')).status).toBe(204);
  expect((await put(target, 'test')).status).toBe(409);
});

it('validates declared sizes, fields and content before completion', async () => {
  for (const size of [0, -1, 1.5, 100_000_001]) {
    const result = await connection.request(
      'mutation($size:Float!) {createFileUpload(filename:"bad.txt",size:$size,fileFolder:FilesField){fileId}}',
      { size },
    );
    expect(result.result.errors![0].extensions.code).toBe('BAD_USER_INPUT');
  }
  const missing = await connection.request(
    'mutation {createFileUpload(filename:"bad.txt",size:2,fileFolder:FilesField){fileId}}',
  );
  expect(missing.result.errors![0].extensions.code).toBe('BAD_USER_INPUT');
  const pending = await create();
  const incomplete = await connection.request(
    'mutation($id:String!){completeFileUpload(fileId:$id){id}}',
    { id: pending.fileId },
  );
  expect(incomplete.result.errors![0].extensions.code).toBe('CONFLICT');
  const invalid = await create('fake.png', 21, 'CorePicture', undefined);
  expect((await put(invalid, 'not an image at all! ')).status).toBe(204);
  const badImage = await connection.request(
    'mutation($id:String!){completeWorkspaceMemberProfilePictureUpload(fileId:$id){id}}',
    { id: invalid.fileId },
  );
  expect(badImage.result.errors![0].extensions.code).toBe('BAD_USER_INPUT');
});

it('uploads avatars and workspace logos and accepts expired signed core picture URLs', async () => {
  const avatar = await create(
    'avatar.png',
    PNG.byteLength,
    'CorePicture',
    undefined,
  );
  expect((await put(avatar, PNG)).status).toBe(204);
  const generic = await connection.request(
    'mutation($id:String!){completeFileUpload(fileId:$id){id}}',
    { id: avatar.fileId },
  );
  expect(generic.result.errors![0].extensions.code).toBe('BAD_USER_INPUT');
  const file = await complete(
    avatar,
    'completeWorkspaceMemberProfilePictureUpload',
  );
  const current = await metadata<{
    currentUser: { workspaceMember: { avatarUrl: string } };
  }>('{currentUser{workspaceMember{avatarUrl}}}');
  expect(new URL(current.currentUser.workspaceMember.avatarUrl).pathname).toBe(
    `/file/core-picture/${file.id}`,
  );
  const expired = await signToken(
    env.APP_SECRET,
    'file',
    { sub: workspaceId, workspaceId, fileId: file.id },
    -60,
  );
  expect(
    (
      await SELF.fetch(
        `${ORIGIN}/file/core-picture/${file.id}?token=${expired.token}`,
      )
    ).status,
  ).toBe(200);
  expect(
    (await SELF.fetch(`${ORIGIN}/file/core-picture/${file.id}`)).status,
  ).toBe(403);
  const logo = await create(
    'logo.png',
    PNG.byteLength,
    'CorePicture',
    undefined,
  );
  expect((await put(logo, PNG)).status).toBe(204);
  const uploaded = await complete(logo, 'completeWorkspaceLogoUpload');
  const workspace = await metadata<{
    currentUser: { currentWorkspace: { logo: string } };
  }>('{currentUser{currentWorkspace{logo}}}');
  expect(new URL(workspace.currentUser.currentWorkspace.logo).pathname).toBe(
    `/file/core-picture/${uploaded.id}`,
  );
});

it('sanitizes SVG scripts, events, foreign content, styles and remote references', async () => {
  const content =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script><foreignObject><iframe src="https://evil.test"/></foreignObject><style>*{fill:url(https://evil.test)}</style><use href="javascript:alert(3)"/><use href="https://evil.test/x.svg#x"/><rect width="10" height="10" fill="red"/><path d="M0 0L1 1" stroke="url(https://evil.test)"/></svg>';
  const target = await create(
    'safe.svg',
    new TextEncoder().encode(content).length,
    'CorePicture',
    undefined,
  );
  expect((await put(target, content)).status).toBe(204);
  const file = await complete(
    target,
    'completeWorkspaceMemberProfilePictureUpload',
  );
  const response = await SELF.fetch(file.url);
  const svg = await response.text();
  expect(response.headers.get('content-type')).toBe('image/svg+xml');
  expect(response.headers.get('content-security-policy')).toContain('sandbox');
  expect(svg).toContain('viewBox="0 0 10 10"');
  expect(svg).toContain('fill="red"');
  expect(svg).not.toMatch(
    /script|onload|foreignObject|iframe|style|evil\.test|javascript/,
  );
});

it('projects fresh file URLs, rejects foreign field references and keeps files referenced by other records', async () => {
  const file = await upload();
  const createAttachment = async (name: string) =>
    records<{
      createAttachment: {
        id: string;
        file: { fileId: string; url: string; extension: string }[];
      };
    }>(
      'mutation($data:AttachmentCreateInput!){createAttachment(data:$data){id file{fileId url extension}}}',
      {
        data: {
          name,
          targetCompanyId: companyId,
          file: [{ fileId: file.id, label: 'proposal.txt' }],
        },
      },
    );
  const first = await createAttachment('First');
  expect(first.errors).toBeUndefined();
  expect(first.data.createAttachment.file[0]).toMatchObject({
    fileId: file.id,
    extension: '.txt',
  });
  expect(
    (await SELF.fetch(first.data.createAttachment.file[0].url)).status,
  ).toBe(200);
  const second = await createAttachment('Second');
  expect(second.errors).toBeUndefined();
  const wrongField = await records(
    'mutation($fileId:UUID!){createPerson(data:{avatarFile:[{fileId:$fileId,label:"Wrong"}]}){id}}',
    { fileId: file.id },
  );
  expect(wrongField.errors![0].extensions.code).toBe('BAD_USER_INPUT');
  await records('mutation($id:UUID!){destroyAttachment(id:$id){id}}', {
    id: first.data.createAttachment.id,
  });
  await inWorkspace(async (_state, instance) => instance.alarm());
  expect((await SELF.fetch(file.url)).status).toBe(200);
  await records('mutation($id:UUID!){deleteAttachment(id:$id){id}}', {
    id: second.data.createAttachment.id,
  });
  await inWorkspace(async (_state, instance) => instance.alarm());
  expect((await SELF.fetch(file.url)).status).toBe(200);
  await records('mutation($id:UUID!){destroyAttachment(id:$id){id}}', {
    id: second.data.createAttachment.id,
  });
  const stored = await inWorkspace((state) =>
    state.storage.sql
      .exec<WorkspaceFile>('SELECT * FROM "meta_file" WHERE "id" = ?', file.id)
      .one(),
  );
  await inWorkspace(async (_state, instance) => instance.alarm());
  expect(await env.FILES.head(stored.storageKey)).toBeNull();
  expect((await SELF.fetch(file.url)).status).toBe(404);
});

it('expires unfinished uploads and deletes their stored R2 objects through the outbox', async () => {
  const target = await create();
  expect((await put(target)).status).toBe(204);
  const key = await inWorkspace(async (state, instance) => {
    const key = state.storage.sql
      .exec<{ storageKey: string }>(
        'SELECT "storageKey" FROM "meta_file" WHERE "id" = ?',
        target.fileId,
      )
      .one().storageKey;
    state.storage.sql.exec(
      'UPDATE "meta_file" SET "expiresAt" = 0 WHERE "id" = ?',
      target.fileId,
    );
    state.storage.sql.exec(
      'UPDATE "sys_scheduledTask" SET "nextRunAt" = 0 WHERE "name" = \'file-cleanup\'',
    );
    await instance.alarm();
    return key;
  });
  expect(await env.FILES.head(key)).toBeNull();
});

it('signs image URLs in global search for FILES image identifiers', async () => {
  const target = await create(
    'person.png',
    PNG.byteLength,
    'FilesField',
    personImageFieldId,
  );
  expect((await put(target, PNG)).status).toBe(204);
  const file = await complete(target);
  const person = await records(
    'mutation($fileId:UUID!){createPerson(data:{name:{firstName:"Stage Nine Image"},avatarFile:[{fileId:$fileId,label:"Person"}]}){id}}',
    { fileId: file.id },
  );
  expect(person.errors).toBeUndefined();
  const search = await records<{
    search: { edges: { node: { imageUrl: string } }[] };
  }>(
    '{search(searchInput:"Stage Nine Image", limit:10, includedObjectNameSingulars:["person"]){edges{node{imageUrl}}}}',
  );
  expect(search.errors).toBeUndefined();
  expect(
    (await SELF.fetch(search.data.search.edges[0].node.imageUrl)).status,
  ).toBe(200);
});

it('accepts the frontend picture settings updates, removes pictures and preserves the current logo', async () => {
  const target = await create(
    'profile.png',
    PNG.byteLength,
    'CorePicture',
    undefined,
  );
  expect((await put(target, PNG)).status).toBe(204);
  const avatar = await complete(
    target,
    'completeWorkspaceMemberProfilePictureUpload',
  );
  await metadata(
    'mutation($input:UpdateWorkspaceMemberSettingsInput!){updateWorkspaceMemberSettings(input:$input)}',
    {
      input: {
        workspaceMemberId: identity.workspaceMemberId,
        update: { avatarUrl: avatar.url.split('?')[0] },
      },
    },
  );
  const logoTarget = await create(
    'logo.png',
    PNG.byteLength,
    'CorePicture',
    undefined,
  );
  expect((await put(logoTarget, PNG)).status).toBe(204);
  const logo = await complete(logoTarget, 'completeWorkspaceLogoUpload');
  await metadata(
    'mutation($data:UpdateWorkspaceInput!){updateWorkspace(data:$data){logo}}',
    { data: { logo: logo.url } },
  );
  await metadata(
    'mutation($input:UpdateWorkspaceMemberSettingsInput!){updateWorkspaceMemberSettings(input:$input)}',
    {
      input: {
        workspaceMemberId: identity.workspaceMemberId,
        update: { avatarUrl: null },
      },
    },
  );
  await inWorkspace(async (state, instance) => {
    state.storage.sql.exec(
      'UPDATE "meta_file" SET "expiresAt" = 0 WHERE "id" = ?',
      logo.id,
    );
    state.storage.sql.exec(
      'UPDATE "sys_scheduledTask" SET "nextRunAt" = 0 WHERE "name" = \'file-cleanup\'',
    );
    await instance.alarm();
  });
  expect((await SELF.fetch(avatar.url)).status).toBe(404);
  expect((await SELF.fetch(logo.url)).status).toBe(200);
  await metadata('mutation{updateWorkspace(data:{logo:null}){logo}}');
  await inWorkspace(async (_state, instance) => instance.alarm());
  expect((await SELF.fetch(logo.url)).status).toBe(404);
});

it('rejects anonymous uploads, another uploader, forged identities and member logo changes', async () => {
  const anonymous = await client().request(
    'mutation{createFileUpload(filename:"test.png",size:10,fileFolder:CorePicture){fileId}}',
  );
  expect(anonymous.result.errors![0].extensions.code).toBe('UNAUTHENTICATED');
  const target = await create(
    'owner.png',
    PNG.byteLength,
    'CorePicture',
    undefined,
  );
  expect((await put(target, PNG)).status).toBe(204);
  await inWorkspace(async (_state, instance) => {
    const member = createRecordIdentity(instance);
    const result = JSON.parse(
      await instance.executeFileOperation(
        'claimCompletion',
        JSON.stringify({ id: target.fileId, purpose: 'avatar' }),
        member,
      ),
    );
    expect(result.error.extensions.code).toBe('FORBIDDEN');
    const forbidden = JSON.parse(
      await instance.executeFileOperation(
        'create',
        JSON.stringify({
          filename: 'bad.txt',
          size: 10,
          workspaceId,
          fileFolder: 'FilesField',
          fieldMetadataId: attachmentFieldId,
        }),
        { ...identity, userId: crypto.randomUUID() },
      ),
    );
    expect(forbidden.error.extensions.code).toBe('FORBIDDEN');
    const own = JSON.parse(
      await instance.executeFileOperation(
        'create',
        JSON.stringify({
          filename: 'own.png',
          size: 10,
          workspaceId,
          fileFolder: 'CorePicture',
        }),
        member,
      ),
    );
    const logo = JSON.parse(
      await instance.executeFileOperation(
        'claimCompletion',
        JSON.stringify({ id: own.value.id, purpose: 'logo' }),
        member,
      ),
    );
    expect(logo.error.extensions.code).toBe('FORBIDDEN');
    const wrongWorkspace = await signToken(
      env.APP_SECRET,
      'file',
      {
        sub: crypto.randomUUID(),
        workspaceId: crypto.randomUUID(),
        fileId: target.fileId,
      },
      60,
    );
    expect(
      (
        await SELF.fetch(
          `${ORIGIN}/file/core-picture/${target.fileId}?token=${wrongWorkspace.token}`,
        )
      ).status,
    ).toBe(403);
  });
});

it('recovers completion after SVG storage was sanitized before the metadata commit', async () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg"><script>bad()</script><rect width="2" height="2" fill="red"/></svg>';
  const target = await create(
    'retry.svg',
    svg.length,
    'CorePicture',
    undefined,
  );
  expect((await put(target, svg)).status).toBe(204);
  const file = await inWorkspace(async (_state, instance) => {
    const response = JSON.parse(
      await instance.executeFileOperation(
        'claimCompletion',
        JSON.stringify({ id: target.fileId, purpose: 'avatar' }),
        identity,
      ),
    );
    return response.value as WorkspaceFile;
  });
  await validateFileContent(env.FILES, file);
  await inWorkspace(async (_state, instance) =>
    instance.executeFileOperation(
      'finishCompletion',
      JSON.stringify({ id: file.id, leaseId: file.leaseId, failed: true }),
    ),
  );
  const completed = await complete(
    target,
    'completeWorkspaceMemberProfilePictureUpload',
  );
  expect(completed.size).toBeLessThan(svg.length);
  expect(await (await SELF.fetch(completed.url)).text()).not.toContain(
    'script',
  );
});

it('routes large file cleanup through the Queue and retries R2 failures without losing metadata', async () => {
  const jobs: { kind: string; workspaceId: string; fileIds: string[] }[] = [];
  const send = vi
    .spyOn(env.JOBS, 'send')
    .mockImplementation(async (body: unknown) => {
      jobs.push(body as (typeof jobs)[number]);
      return { metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } } };
    });
  const files = await inWorkspace(async (state) => {
    const store = new WorkspaceFileStore(state.storage.sql);
    const files = Array.from({ length: 21 }, () =>
      store.create(
        {
          workspaceId,
          filename: 'queued.txt',
          size: 4,
          fileFolder: 'FilesField',
          fieldMetadataId: attachmentFieldId,
        },
        identity,
      ),
    );
    for (const file of files) await env.FILES.put(file.storageKey, 'test');
    await processFileCleanup(state.storage, env, {
      id: crypto.randomUUID(),
      kind: 'file-cleanup',
      attempts: 1,
      payload: { fileIds: files.map((file) => file.id) },
    });
    return files;
  });
  send.mockRestore();
  expect(jobs).toHaveLength(1);
  const batch = createMessageBatch('twenty-jobs', [
    { id: 'file-job', timestamp: Date.now(), attempts: 1, body: jobs[0] },
  ]);
  const context = createExecutionContext();
  await worker.queue(batch, env);
  expect((await getQueueResult(batch, context)).explicitAcks).toEqual([
    'file-job',
  ]);
  expect(await env.FILES.head(files[0].storageKey)).toBeNull();
  const target = await create();
  expect((await put(target)).status).toBe(204);
  const failed = vi
    .spyOn(env.FILES, 'delete')
    .mockRejectedValueOnce(new Error('R2 unavailable'));
  await inWorkspace(async (state, instance) => {
    state.storage.sql.exec(
      'UPDATE "meta_file" SET "expiresAt" = 0 WHERE "id" = ?',
      target.fileId,
    );
    state.storage.sql.exec(
      'UPDATE "sys_scheduledTask" SET "nextRunAt" = 0 WHERE "name" = \'file-cleanup\'',
    );
    await instance.alarm();
    expect(
      new WorkspaceFileStore(state.storage.sql).find(target.fileId)?.status,
    ).toBe('DELETING');
    expect(
      state.storage.sql
        .exec(
          'SELECT "id" FROM "sys_outbox" WHERE "kind" = \'file-cleanup\' AND "status" = \'pending\' AND "lastError" IS NOT NULL',
        )
        .toArray().length,
    ).toBeGreaterThan(0);
  });
  failed.mockRestore();
  await inWorkspace(async (state, instance) => {
    state.storage.sql.exec(
      'UPDATE "sys_outbox" SET "availableAt" = 0 WHERE "kind" = \'file-cleanup\' AND "status" = \'pending\'',
    );
    await instance.alarm();
    expect(
      new WorkspaceFileStore(state.storage.sql).find(target.fileId),
    ).toBeUndefined();
  });
  const abandoned = await create();
  expect((await put(abandoned)).status).toBe(204);
  await inWorkspace(async (state, instance) => {
    state.storage.sql.exec(
      'UPDATE "meta_file" SET "status" = \'DELETING\', "expiresAt" = 0 WHERE "id" = ?',
      abandoned.fileId,
    );
    state.storage.sql.exec(
      'UPDATE "sys_scheduledTask" SET "nextRunAt" = 0 WHERE "name" = \'file-cleanup\'',
    );
    await instance.alarm();
    expect(
      new WorkspaceFileStore(state.storage.sql).find(abandoned.fileId),
    ).toBeUndefined();
  });
});

it('supports the legacy multipart upload mutation with the same validation and signed downloads', async () => {
  const form = new FormData();
  form.set(
    'operations',
    JSON.stringify({
      query:
        'mutation($file:Upload!){uploadWorkspaceMemberProfilePicture(file:$file){id url}}',
      variables: { file: null },
    }),
  );
  form.set('map', JSON.stringify({ 0: ['variables.file'] }));
  form.set('0', new File([PNG], 'legacy.png', { type: 'image/png' }));
  const response = await SELF.fetch(`${ORIGIN}/metadata`, {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      cookie: connection.cookie,
      'x-twenty-session-cookie': '1',
      'apollo-require-preflight': 'true',
    },
    body: form,
  });
  const result = (await response.json()) as {
    data: { uploadWorkspaceMemberProfilePicture: { url: string } };
    errors?: unknown;
  };
  expect(result.errors).toBeUndefined();
  expect(
    (await SELF.fetch(result.data.uploadWorkspaceMemberProfilePicture.url))
      .status,
  ).toBe(200);
});

it('deletes R2 content when permanently destroying a record cascades to its attachments', async () => {
  const file = await upload();
  const company = await records<{ createCompany: { id: string } }>(
    'mutation{createCompany(data:{name:"File cascade"}){id}}',
  );
  expect(company.errors).toBeUndefined();
  const attachment = await records(
    'mutation($data:AttachmentCreateInput!){createAttachment(data:$data){id}}',
    {
      data: {
        name: 'Cascade.txt',
        targetCompanyId: company.data.createCompany.id,
        file: [{ fileId: file.id, label: 'Cascade.txt' }],
      },
    },
  );
  expect(attachment.errors).toBeUndefined();
  const destroyed = await records(
    'mutation($id:UUID!){destroyCompany(id:$id){id}}',
    { id: company.data.createCompany.id },
  );
  expect(destroyed.errors).toBeUndefined();
  await inWorkspace(async (_state, instance) => instance.alarm());
  expect((await SELF.fetch(file.url)).status).toBe(404);
  const row = await inWorkspace((state) =>
    new WorkspaceFileStore(state.storage.sql).find(file.id),
  );
  expect(row).toBeUndefined();
});
