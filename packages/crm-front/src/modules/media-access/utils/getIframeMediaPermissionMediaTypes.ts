import { type MediaSessionMediaType } from '@/media-access/types/MediaAccessSession';
import { type IframeMediaPermission } from 'crm-shared/types';

export const getIframeMediaPermissionMediaTypes = (
  permission: Pick<IframeMediaPermission, 'microphone' | 'camera'>,
): MediaSessionMediaType[] => [
  ...(permission.microphone ? (['audio'] as const) : []),
  ...(permission.camera ? (['video'] as const) : []),
];
