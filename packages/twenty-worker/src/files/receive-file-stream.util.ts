import { apiError } from '@/shared/errors/api-error.util';
import { type WorkspaceFile } from '@/files/types/workspace-file.type';

export const receiveFileStream = async (
  request: Request,
  bucket: R2Bucket,
  file: WorkspaceFile,
) => {
  const length = request.headers.get('content-length');
  if (length !== null && Number(length) !== file.declaredSize)
    throw apiError(
      'Upload size differs from the declared size',
      'BAD_USER_INPUT',
      Number(length) > file.declaredSize
        ? 'FILE_TOO_LARGE'
        : 'FILE_SIZE_MISMATCH',
    );
  if (!request.body) throw apiError('Empty upload body');
  const fixed = new FixedLengthStream(file.declaredSize);
  const abort = new AbortController();
  let received = 0;
  const limited = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > file.declaredSize)
          throw apiError(
            'Upload exceeds the declared size',
            'BAD_USER_INPUT',
            'FILE_TOO_LARGE',
          );
        controller.enqueue(chunk);
      },
    }),
  );
  const pumping = limited.pipeTo(fixed.writable, { signal: abort.signal });
  const uploading = bucket
    .put(file.storageKey, fixed.readable, {
      onlyIf: { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: 'application/octet-stream' },
    })
    .then((result) => {
      if (!result)
        throw apiError('File content was already received', 'CONFLICT');
    })
    .catch((error: unknown) => {
      abort.abort(error);
      throw error;
    });
  const results = await Promise.allSettled([pumping, uploading]);
  const failure = results.find((result) => result.status === 'rejected');
  if (failure?.status === 'rejected') {
    if (received > file.declaredSize)
      throw apiError(
        'Upload exceeds the declared size',
        'BAD_USER_INPUT',
        'FILE_TOO_LARGE',
      );
    if (received < file.declaredSize)
      throw apiError(
        'Upload size differs from the declared size',
        'BAD_USER_INPUT',
        'FILE_SIZE_MISMATCH',
      );
    throw failure.reason;
  }
};
