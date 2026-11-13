import { isPlainObject } from 'twenty-shared/utils';

import { signedFileUrl } from '@/files/file-url.util';
import { WorkspaceFileStore } from '@/files/workspace-file-store';
import { type FileUrlContext } from '@/files/types/workspace-file.type';

export const projectFileValues = (
  sql: SqlStorage,
  value: unknown,
  context?: FileUrlContext,
) => {
  if (!Array.isArray(value) || !context) return value;
  const store = new WorkspaceFileStore(sql);
  return value.map((item: unknown) => {
    if (!isPlainObject(item) || typeof item.fileId !== 'string') return item;
    const file = store.find(item.fileId);
    if (!file || file.status !== 'UPLOADED')
      return { fileId: item.fileId, label: item.label, extension: '', url: '' };
    return {
      fileId: file.id,
      label: item.label,
      extension: file.filename.includes('.')
        ? `.${file.filename.split('.').at(-1)!.toLowerCase()}`
        : '',
      url: signedFileUrl(context, file.id, file.folder),
    };
  });
};
