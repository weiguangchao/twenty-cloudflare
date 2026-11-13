import { apiError } from '@/shared/errors/api-error.util';
import { WorkspaceFileStore } from '@/files/workspace-file-store';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';

export const executeFileOperation = (
  sql: SqlStorage,
  operation: string,
  input: Record<string, unknown>,
  identity?: RecordQueryIdentity,
  onboarding = false,
) => {
  const store = new WorkspaceFileStore(sql);
  const id = String(input.id);
  switch (operation) {
    case 'create':
      if (!identity) throw apiError('Permission denied', 'FORBIDDEN');
      return store.create(input, identity, onboarding);
    case 'get':
      return store.find(id) ?? null;
    case 'claimUpload':
      return store.claim(id, 'upload');
    case 'claimCompletion':
      return store.claim(
        id,
        'complete',
        identity,
        String(input.purpose),
        onboarding,
      );
    case 'finishUpload':
      return store.finish(
        id,
        String(input.leaseId),
        'upload',
        input,
        input.failed === true,
      );
    case 'finishCompletion':
      return store.finish(
        id,
        String(input.leaseId),
        'complete',
        input,
        input.failed === true,
      );
    default:
      throw apiError('Unknown file operation');
  }
};
