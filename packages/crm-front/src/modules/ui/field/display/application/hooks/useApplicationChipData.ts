import {
  type ApplicationAvatarColors,
  useApplicationAvatarColors,
} from '@/ui/field/display/application/hooks/useApplicationAvatarColors';
import { getApplicationDisplayName } from '@/ui/field/display/application/utils/getApplicationDisplayName';
import { getCustomApplicationLogoUrl } from '@/ui/field/display/application/utils/getCustomApplicationLogoUrl';
import { isCrmStandardApplication } from '@/ui/field/display/application/utils/isCrmStandardApplication';
import { isWorkspaceCustomApplication } from '@/ui/field/display/application/utils/isWorkspaceCustomApplication';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'crm-shared/utils';
import StandardLogo from '@/ui/field/display/application/assets/standard-logo.webp';

type UseApplicationChipDataArgs = {
  applicationId?: string | null;
  fallbackApplicationData?: {
    logoUrl?: string | null;
    name?: string | null;
  };
};

type ApplicationChipData = {
  name: string;
  seed: string;
  colors?: ApplicationAvatarColors;
  logo?: string;
};

type UseApplicationChipDataReturnType = {
  applicationChipData: ApplicationChipData;
};

export const useApplicationChipData = ({
  applicationId,
  fallbackApplicationData,
}: UseApplicationChipDataArgs): UseApplicationChipDataReturnType => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  const application = currentWorkspace?.installedApplications.find(
    (installedApplication) => installedApplication.id === applicationId,
  );

  const colors = useApplicationAvatarColors(application);

  if (!isDefined(application)) {
    return {
      applicationChipData: {
        name: fallbackApplicationData?.name ?? '',
        logo: fallbackApplicationData?.logoUrl ?? '',
        seed: fallbackApplicationData?.name ?? '',
      },
    };
  }

  const isStandard = isCrmStandardApplication(application);

  const isCustom = isWorkspaceCustomApplication(application, currentWorkspace);

  const displayName = getApplicationDisplayName({
    application,
    currentWorkspace,
  });

  const logo = isStandard
    ? new URL(StandardLogo, window.location.href).toString()
    : isCustom
      ? getCustomApplicationLogoUrl()
      : (application.logoUrl ?? undefined);

  return {
    applicationChipData: {
      name: displayName,
      seed: application.name,
      colors,
      logo,
    },
  };
};
