import { isPlainObject } from 'twenty-shared/utils';

import { type MetadataRow } from '@/workspace/metadata/types/metadata-row.type';

const EXCLUDED_SETTINGS_PATHS = [
  'accounts',
  'ai',
  'applications',
  'billing',
  'developers',
  'domains',
  'admin-panel',
  'security',
].map((page) => `/settings/${page}`);

export const isCoreCommandMenuItem = (item: MetadataRow<'commandMenuItem'>) => {
  if (!item.isActive) return false;
  if (!isPlainObject(item.payload) || typeof item.payload.path !== 'string')
    return true;
  const pathname = item.payload.path.split(/[?#]/)[0];

  return !EXCLUDED_SETTINGS_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
};
