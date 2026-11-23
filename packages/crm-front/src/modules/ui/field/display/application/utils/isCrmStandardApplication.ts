import { CRM_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER } from 'crm-shared/application';
import { isDefined } from 'crm-shared/utils';

type ApplicationLike = {
  universalIdentifier?: string | null;
};

export const isCrmStandardApplication = (
  application: ApplicationLike | null | undefined,
): boolean =>
  isDefined(application?.universalIdentifier) &&
  application.universalIdentifier ===
    CRM_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER;
