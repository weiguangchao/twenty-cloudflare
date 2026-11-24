import { type IframeMediaPermission } from 'crm-shared/types';
import { isDefined } from 'crm-shared/utils';

export const isIframeMediaPermissionCovered = ({
  permission,
  coveringPermission,
}: {
  permission: IframeMediaPermission;
  coveringPermission: IframeMediaPermission | null;
}): boolean =>
  isDefined(coveringPermission) &&
  coveringPermission.origin === permission.origin &&
  (!permission.microphone || coveringPermission.microphone) &&
  (!permission.camera || coveringPermission.camera);
