import { getWorkspaceStub } from '@/workspace/get-workspace-stub.util';
import { GraphQLError } from 'graphql';
import { isValidUuid } from 'crm-shared/utils';

import { verifyToken } from '@/auth/token.service';
import { fileRpc } from '@/files/file-rpc.util';
import { receiveFileStream } from '@/files/receive-file-stream.util';
import { type WorkspaceFile } from '@/files/types/workspace-file.type';
import { apiError } from '@/shared/errors/api-error.util';

const fileErrorResponse = (error: unknown) => {
  if (error instanceof GraphQLError) {
    const code = error.extensions.code;
    const status = ['UNAUTHENTICATED', 'FORBIDDEN'].includes(String(code))
      ? 403
      : code === 'NOT_FOUND'
        ? 404
        : error.extensions.subCode === 'FILE_TOO_LARGE'
          ? 413
          : code === 'CONFLICT'
            ? 409
            : 400;
    if (status === 403)
      return Response.json(
        { message: 'Forbidden resource', error: 'Forbidden', statusCode: 403 },
        { status: 403 },
      );
    return Response.json(
      {
        statusCode: status,
        error: 'Error',
        messages: [error.message],
        code: error.extensions.subCode ?? code,
      },
      { status },
    );
  }
  console.error('File request failed', error);
  return Response.json(
    { statusCode: 500, error: 'INTERNAL_SERVER_ERROR' },
    { status: 500 },
  );
};

export const handleFileUploadRequest = async (
  request: Request,
  env: Env,
  id: string,
) => {
  try {
    const token = new URL(request.url).searchParams.get('token');
    if (!token || !isValidUuid(id))
      throw apiError('Invalid upload token', 'FORBIDDEN');
    const claims = await verifyToken(env.APP_SECRET, 'file-upload', token);
    if (
      claims.fileId !== id ||
      !claims.workspaceId ||
      claims.sub !== claims.workspaceId
    )
      throw apiError('Invalid upload token', 'FORBIDDEN');
    const stub = getWorkspaceStub(env, claims.workspaceId);
    const file = await fileRpc<WorkspaceFile>(stub, 'claimUpload', { id });
    try {
      await receiveFileStream(request, env.FILES, file);
      await fileRpc(stub, 'finishUpload', { id, leaseId: file.leaseId });
    } catch (error) {
      await fileRpc(stub, 'finishUpload', {
        id,
        leaseId: file.leaseId,
        failed: true,
      }).catch(() => undefined);
      throw error;
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return fileErrorResponse(error);
  }
};

export const handleFileDownloadRequest = async (
  request: Request,
  env: Env,
  folder: string,
  id: string,
) => {
  try {
    const token = new URL(request.url).searchParams.get('token');
    if (!token || !isValidUuid(id))
      throw apiError('Invalid file token', 'FORBIDDEN');
    const claims = await verifyToken(
      env.APP_SECRET,
      'file',
      token,
      folder === 'core-picture',
    );
    if (
      claims.fileId !== id ||
      !claims.workspaceId ||
      claims.sub !== claims.workspaceId
    )
      throw apiError('Invalid file token', 'FORBIDDEN');
    const file = await fileRpc<WorkspaceFile | null>(
      getWorkspaceStub(env, claims.workspaceId),
      'get',
      { id },
    );
    if (
      file &&
      (file.folder !== folder || file.workspaceId !== claims.workspaceId)
    )
      throw apiError('Invalid file token', 'FORBIDDEN');
    if (!file || file.status !== 'UPLOADED')
      throw apiError('File not found', 'NOT_FOUND', 'FILE_NOT_FOUND');
    const metadata = await env.FILES.head(file.storageKey);
    if (!metadata)
      throw apiError('File not found', 'NOT_FOUND', 'FILE_NOT_FOUND');
    const headers = new Headers({
      'content-type': file.mimeType,
      'content-disposition':
        /^(?:image\/|audio\/|video\/|text\/plain$|application\/pdf$)/.test(
          file.mimeType,
        )
          ? 'inline'
          : 'attachment',
      'cache-control': `private, max-age=${folder === 'core-picture' ? 86400 : Math.max(0, Math.min(86400, Math.floor(claims.exp - Date.now() / 1000)))}, immutable`,
      etag: metadata.httpEtag,
      'last-modified': metadata.uploaded.toUTCString(),
      'accept-ranges': 'bytes',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
    });
    if (
      request.headers
        .get('if-none-match')
        ?.split(',')
        .map((value) => value.trim())
        .some((value) => value === metadata.httpEtag || value === '*')
    )
      return new Response(null, { status: 304, headers });
    let range: { offset: number; length: number } | undefined;
    const requested = request.headers.get('range');
    const ifRange = request.headers.get('if-range');
    if (
      requested &&
      (!ifRange ||
        ifRange === metadata.httpEtag ||
        Date.parse(ifRange) >= metadata.uploaded.getTime())
    ) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(requested);
      const start = match?.[1]
        ? Number(match[1])
        : match?.[2]
          ? Math.max(0, file.size - Number(match[2]))
          : Number.NaN;
      const end =
        match?.[1] && match[2]
          ? Math.min(file.size - 1, Number(match[2]))
          : file.size - 1;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start > end ||
        start >= file.size ||
        (match?.[1] === '' && Number(match[2]) === 0)
      )
        return new Response(null, {
          status: 416,
          headers: {
            ...Object.fromEntries(headers),
            'content-range': `bytes */${file.size}`,
          },
        });
      range = { offset: start, length: end - start + 1 };
      headers.set('content-range', `bytes ${start}-${end}/${file.size}`);
    }
    headers.set('content-length', String(range?.length ?? file.size));
    if (request.method === 'HEAD')
      return new Response(null, { status: range ? 206 : 200, headers });
    const object = await env.FILES.get(file.storageKey, { range });
    if (!object)
      throw apiError('File not found', 'NOT_FOUND', 'FILE_NOT_FOUND');
    return new Response(object.body, { status: range ? 206 : 200, headers });
  } catch (error) {
    return fileErrorResponse(error);
  }
};
