import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import {
  type Application,
  type Role,
  type Workspace,
} from '~/generated-metadata/graphql';

export type CurrentWorkspace = Pick<
  Workspace,
  | 'id'
  | 'inviteHash'
  | 'logo'
  | 'displayName'
  | 'featureFlags'
  | 'activationStatus'
  | 'billingSubscriptions'
  | 'billingCustomer'
  | 'isTrialAvailable'
  | 'workspaceMembersCount'
  | 'isPublicInviteLinkEnabled'
  | 'isCampaignClickTrackingEnabled'
  | 'isCampaignOpenTrackingEnabled'
  | 'workspaceDiscoverability'
  | 'isGoogleAuthEnabled'
  | 'isMicrosoftAuthEnabled'
  | 'isPasswordAuthEnabled'
  | 'isCustomDomainEnabled'
  | 'iframeMediaPermissions'
  | 'subdomain'
  | 'customDomain'
  | 'workspaceUrls'
  | 'isTwoFactorAuthenticationEnforced'
  | 'trashRetentionDays'
  | 'aiChatModelTier'
  | 'aiChatAssistantProfile'
  | 'aiChatDirectMessageAssistantMode'
  | 'aiChatInboxAssistantMode'
  | 'aiAgentModelTier'
  | 'isAutoModelSelectionEnabled'
  | 'aiModelIdByTier'
  | 'aiAdditionalInstructions'
  | 'aiDataPolicy'
  | 'editableProfileFields'
  | 'isInternalMessagesImportEnabled'
> & {
  defaultRole?: Omit<Role, 'workspaceMembers' | 'agents' | 'apiKeys'> | null;
  workspaceCustomApplication: Pick<Application, 'id'> | null;
  installedApplications: Pick<
    Application,
    | 'id'
    | 'name'
    | 'description'
    | 'universalIdentifier'
    | 'logoUrl'
    | 'createdAt'
  >[];
};

export const currentWorkspaceState = createAtomState<CurrentWorkspace | null>({
  key: 'currentWorkspaceState',
  defaultValue: null,
  useLocalStorage: true,
  localStorageOptions: { getOnInit: true },
});
