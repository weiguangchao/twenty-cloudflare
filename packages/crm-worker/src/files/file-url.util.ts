import { createHmac } from 'node:crypto';

import { FILE_TOKEN_SECONDS } from '@/files/file.constants';
import { type FileUrlContext } from '@/files/types/workspace-file.type';

// Record projection runs inside transactionSync, so signing must stay synchronous.
export const signedFileUrl = (
  context: FileUrlContext,
  fileId: string,
  folder: string,
) => {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: context.workspaceId,
    workspaceId: context.workspaceId,
    fileId,
    type: 'file',
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + FILE_TOKEN_SECONDS,
  })}`;
  const key = createHmac('sha256', context.secret)
    // Original key context; renaming it would break stored file links.
    .update('twenty-worker:file')
    .digest();
  const signature = createHmac('sha256', key).update(body).digest('base64url');
  return `${context.origin}/file/${folder}/${fileId}?token=${body}.${signature}`;
};
