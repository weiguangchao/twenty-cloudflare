import { SELF } from 'cloudflare:test';
import { beforeAll, expect, it } from 'vitest';

import avatarCreate from '../../contract/fixtures/files/021-CreateFileUpload.json';
import avatarComplete from '../../contract/fixtures/files/023-CompleteWorkspaceMemberProfilePictureUpload.json';
import secondAvatarCreate from '../../contract/fixtures/files/026-CreateFileUpload.json';
import secondAvatarComplete from '../../contract/fixtures/files/028-CompleteWorkspaceMemberProfilePictureUpload.json';
import logoCreate from '../../contract/fixtures/files/037-CreateFileUpload.json';
import logoComplete from '../../contract/fixtures/files/039-CompleteWorkspaceLogoUpload.json';
import attachmentCreate from '../../contract/fixtures/files/074-CreateFileUpload.json';
import attachmentComplete from '../../contract/fixtures/files/076-CompleteFileUpload.json';
import fieldCreate from '../../contract/fixtures/files/099-CreateFileUpload.json';
import fieldComplete from '../../contract/fixtures/files/101-CompleteFileUpload.json';
import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  prepareWorkspace,
  setupCoreTestDatabase,
} from '../utils/auth-test.util';

const connection = client();
let fieldMetadataId: string;

beforeAll(async () => {
  await setupCoreTestDatabase();
  await clearCoreTestDatabase();
  await prepareWorkspace(connection);
  const result = await connection.request<{
    objects: {
      edges: {
        node: {
          nameSingular: string;
          fieldsList: { id: string; name: string }[];
        };
      }[];
    };
  }>(
    '{objects(paging:{first:100}){edges{node{nameSingular fieldsList{id name}}}}}',
  );
  fieldMetadataId = result.result
    .data!.objects.edges.find(
      (edge) => edge.node.nameSingular === 'attachment',
    )!
    .node.fieldsList.find((field) => field.name === 'file')!.id;
});

it.each([
  ['021/023 avatar', avatarCreate, avatarComplete],
  ['026/028 replacement avatar', secondAvatarCreate, secondAvatarComplete],
  ['037/039 logo', logoCreate, logoComplete],
  ['074/076 attachment', attachmentCreate, attachmentComplete],
  ['099/101 Files field', fieldCreate, fieldComplete],
] as const)(
  'replays files/%s upload contracts',
  async (_name, creation, completion) => {
    const picture = creation.variables.fileFolder === 'CorePicture';
    const body = picture
      ? Uint8Array.from(
          atob(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1kAAAAASUVORK5CYII=',
          ),
          (value) => value.charCodeAt(0),
        )
      : new TextEncoder().encode('Proposal draft for Airbnb\n'.repeat(50));
    const created = await connection.request<{
      createFileUpload: {
        fileId: string;
        uploadUrl: string;
        contentType: string;
        expiresAt: string;
        __typename: string;
      };
    }>(creation.query, {
      ...creation.variables,
      size: body.byteLength,
      ...(!picture ? { fieldMetadataId } : {}),
    });
    expect(created.result.errors).toBeUndefined();
    const target = created.result.data!.createFileUpload;
    expect(target).toMatchObject({
      contentType: 'application/octet-stream',
      __typename: 'FileUploadTarget',
    });
    expect(target.uploadUrl).toContain(
      `${ORIGIN}/file-upload/${target.fileId}?token=`,
    );
    expect(Date.parse(target.expiresAt)).toBeGreaterThan(Date.now());
    expect(
      (
        await SELF.fetch(target.uploadUrl, {
          method: 'PUT',
          headers: { 'content-type': target.contentType },
          body,
        })
      ).status,
    ).toBe(204);
    const completed = await connection.request<
      Record<
        string,
        {
          id: string;
          path: string;
          size: number;
          createdAt: string;
          url: string;
          __typename: string;
        }
      >
    >(completion.query, { fileId: target.fileId });
    expect(completed.result.errors).toBeUndefined();
    const file = Object.values(completed.result.data!)[0];
    expect(file).toMatchObject({
      id: target.fileId,
      size: body.byteLength,
      __typename: 'FileWithSignedUrl',
    });
    expect(file.path).toMatch(
      picture
        ? /^core-picture\/[^/]+\.png$/
        : /^files-field\/[^/]+\/[^/]+\.txt$/,
    );
    expect(Number.isFinite(Date.parse(file.createdAt))).toBe(true);
    const downloaded = await SELF.fetch(file.url);
    expect(downloaded.status).toBe(200);
    expect(new Uint8Array(await downloaded.arrayBuffer())).toEqual(body);
  },
);
