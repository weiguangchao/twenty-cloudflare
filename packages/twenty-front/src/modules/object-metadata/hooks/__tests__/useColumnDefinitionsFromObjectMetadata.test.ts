import { renderHook } from '@testing-library/react';
import { DEFAULT_AI_CHAT_ASSISTANT_PROFILE } from 'twenty-shared/ai';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { CUSTOM_WORKSPACE_APPLICATION_MOCK } from '@/object-metadata/hooks/__tests__/constants/CustomWorkspaceApplicationMock.test.constant';
import { useColumnDefinitionsFromObjectMetadata } from '@/object-metadata/hooks/useColumnDefinitionsFromObjectMetadata';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import {
  AiChatAssistantMode,
  AiModelTier,
  WorkspaceActivationStatus,
  WorkspaceDiscoverability,
} from '~/generated-metadata/graphql';
import { getJestMetadataAndApolloMocksAndCommandMenuWrapper } from '~/testing/jest/getJestMetadataAndApolloMocksAndCommandMenuWrapper';
import { getTestEnrichedObjectMetadataItemsMock } from '~/testing/utils/getTestEnrichedObjectMetadataItemsMock';

const Wrapper = getJestMetadataAndApolloMocksAndCommandMenuWrapper({
  apolloMocks: [],
  componentInstanceId: 'instanceId',
  contextStoreCurrentObjectMetadataNameSingular: 'company',
});

describe('useColumnDefinitionsFromObjectMetadata', () => {
  it('should return expected definitions', () => {
    jotaiStore.set(currentWorkspaceState.atom, {
      workspaceCustomApplication: {
        id: CUSTOM_WORKSPACE_APPLICATION_MOCK.id,
      },
      installedApplications: [],
      id: '1',
      featureFlags: [],
      subdomain: 'test',
      activationStatus: WorkspaceActivationStatus.ACTIVE,
      isPublicInviteLinkEnabled: false,
      isCampaignClickTrackingEnabled: false,
      isCampaignOpenTrackingEnabled: false,
      workspaceDiscoverability: WorkspaceDiscoverability.PUBLIC,
      isGoogleAuthEnabled: true,
      isMicrosoftAuthEnabled: false,
      isPasswordAuthEnabled: true,
      isCustomDomainEnabled: false,
      customDomain: 'my-custom-domain.com',
      workspaceUrls: {
        subdomainUrl: 'https://twenty.example.com',
        customUrl: 'https://my-custom-domain.com',
      },
      isTwoFactorAuthenticationEnforced: false,
      trashRetentionDays: 14,
      aiChatModelTier: AiModelTier.fast,
      aiChatAssistantProfile: DEFAULT_AI_CHAT_ASSISTANT_PROFILE,
      aiChatDirectMessageAssistantMode: AiChatAssistantMode.MENTION_ONLY,
      aiChatInboxAssistantMode: AiChatAssistantMode.AUTOMATIC,
      aiAgentModelTier: AiModelTier.fast,
      isAutoModelSelectionEnabled: true,
      aiModelIdByTier: {},
      isInternalMessagesImportEnabled: false,
    });

    const companyObjectMetadata = getTestEnrichedObjectMetadataItemsMock().find(
      (item) => item.nameSingular === 'company',
    );

    const { result } = renderHook(
      (objectMetadataItem: EnrichedObjectMetadataItem) => {
        return useColumnDefinitionsFromObjectMetadata(objectMetadataItem);
      },
      {
        initialProps: companyObjectMetadata,
        wrapper: Wrapper,
      },
    );

    const { columnDefinitions } = result.current;

    expect(columnDefinitions.length).toBe(24);
  });
});
