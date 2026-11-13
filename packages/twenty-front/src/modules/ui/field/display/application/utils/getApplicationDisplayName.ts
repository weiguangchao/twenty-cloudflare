import { t } from '@lingui/core/macro';

import { isTwentyStandardApplication } from '@/ui/field/display/application/utils/isTwentyStandardApplication';
import { isWorkspaceCustomApplication } from '@/ui/field/display/application/utils/isWorkspaceCustomApplication';

type ApplicationLike = {
  id?: string | null;
  name: string;
  universalIdentifier?: string | null;
};

type WorkspaceLike = {
  workspaceCustomApplication?: { id?: string | null } | null;
};

export const getApplicationDisplayName = ({
  application,
  currentWorkspace,
}: {
  application: ApplicationLike;
  currentWorkspace: WorkspaceLike | null | undefined;
}): string => {
  if (isTwentyStandardApplication(application)) {
    return t`Standard`;
  }

  if (isWorkspaceCustomApplication(application, currentWorkspace)) {
    return t`Custom`;
  }

  return application.name;
};
