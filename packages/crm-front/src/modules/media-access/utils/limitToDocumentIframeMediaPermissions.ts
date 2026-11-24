import { getDocumentIframeMediaPermissions } from '@/media-access/utils/getDocumentIframeMediaPermissions';
import { type IframeMediaPermission } from 'crm-shared/types';
import { intersectIframeMediaPermissions, isDefined } from 'crm-shared/utils';

export const limitToDocumentIframeMediaPermissions = (
  permissions: readonly IframeMediaPermission[],
): readonly IframeMediaPermission[] => {
  const documentPermissions = getDocumentIframeMediaPermissions();

  return isDefined(documentPermissions)
    ? intersectIframeMediaPermissions({
        permissions,
        allowedPermissions: documentPermissions,
      })
    : permissions;
};
