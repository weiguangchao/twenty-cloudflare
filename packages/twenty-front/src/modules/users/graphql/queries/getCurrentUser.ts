import { gql } from '@apollo/client';

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    currentUser {
      ...UserQueryFragment
    }
  }

  fragment WorkspaceMemberQueryFragment on WorkspaceMember {
    id
    name {
      firstName
      lastName
    }
    colorScheme
    uiScale
    openRecordIn
    avatarUrl
    locale
    userEmail
    userId
    userWorkspaceId
    timeZone
    dateFormat
    timeFormat
    calendarStartDay
    numberFormat
  }

  fragment PartialWorkspaceMemberQueryFragment on WorkspaceMember {
    id
    name {
      firstName
      lastName
    }
    avatarUrl
    userEmail
    userId
    userWorkspaceId
  }

  fragment DeletedWorkspaceMemberQueryFragment on DeletedWorkspaceMember {
    id
    name {
      firstName
      lastName
    }
    avatarUrl
    userEmail
  }

  fragment WorkspaceUrlsFragment on WorkspaceUrls {
    subdomainUrl
    customUrl
  }

  fragment BillingSubscriptionSchedulePhaseItemFragment on BillingSubscriptionSchedulePhaseItem {
    price
    quantity
  }

  fragment BillingSubscriptionSchedulePhaseFragment on BillingSubscriptionSchedulePhase {
    start_date
    end_date
    items {
      ...BillingSubscriptionSchedulePhaseItemFragment
    }
  }

  fragment BillingSubscriptionFragment on BillingSubscription {
    id
    status
    metadata
    cancelAt
    phases {
      ...BillingSubscriptionSchedulePhaseFragment
    }
  }

  fragment RoleFragment on Role {
    id
    label
    description
    icon
    canUpdateAllSettings
    canAccessAllTools
    canAccessAllAgentChatChannels
    isEditable
    canReadAllObjectRecords
    canUpdateAllObjectRecords
    canSoftDeleteAllObjectRecords
    canDestroyAllObjectRecords
    canBeAssignedToUsers
    canBeAssignedToAgents
    canBeAssignedToApiKeys
    applicationId
    universalIdentifier
  }

  fragment AvailableWorkspaceFragment on AvailableWorkspace {
    id
    displayName
    loginToken
    inviteHash
    personalInviteToken
    workspaceUrls {
      subdomainUrl
      customUrl
    }
    logo
  }

  fragment AvailableWorkspacesFragment on AvailableWorkspaces {
    availableWorkspacesForSignIn {
      ...AvailableWorkspaceFragment
    }
    availableWorkspacesForSignUp {
      ...AvailableWorkspaceFragment
    }
  }

  fragment UserQueryFragment on User {
    id
    firstName
    lastName
    email
    hasPassword
    canAccessFullAdminPanel
    canImpersonate
    supportUserHash
    onboardingStatus
    previousOnboardingStatus
    isWorkspaceCreator
    workspaceMember {
      ...WorkspaceMemberQueryFragment
    }
    workspaceMembers {
      ...PartialWorkspaceMemberQueryFragment
    }
    deletedWorkspaceMembers {
      ...DeletedWorkspaceMemberQueryFragment
    }
    currentUserWorkspace {
      id
      permissionFlags
      isImpersonating
      objectRecordsPermissions {
        objectMetadataId
        canCreateAllRecords
        canReadAllRecords
        canUpdateAllRecords
        canSoftDeleteAllRecords
        canDestroyAllRecords
        unreadableFields
        uneditableFields
        restrictedFields
      }
      twoFactorAuthenticationMethodSummary {
        twoFactorAuthenticationMethodId
        status
        strategy
      }
    }
    currentWorkspace {
      id
      displayName
      logo
      inviteHash
      activationStatus
      isPublicInviteLinkEnabled
      isCampaignClickTrackingEnabled
      isCampaignOpenTrackingEnabled
      workspaceDiscoverability
      isGoogleAuthEnabled
      isMicrosoftAuthEnabled
      isPasswordAuthEnabled
      subdomain
      customDomain
      workspaceCustomApplication {
        id
      }
      installedApplications {
        id
        name
        description
        universalIdentifier
        logoUrl
        createdAt
      }
      isCustomDomainEnabled
      iframeMediaPermissions {
        origin
        microphone
        camera
      }
      workspaceUrls {
        ...WorkspaceUrlsFragment
      }
      featureFlags {
        key
        value
      }
      billingCustomer {
        id
        hasPaymentMethod
        userCreditsFallback
      }
      billingSubscriptions {
        ...BillingSubscriptionFragment
      }
      isTrialAvailable
      workspaceMembersCount
      defaultRole {
        ...RoleFragment
      }
      aiChatModelTier
      aiChatAssistantProfile {
        displayName
        avatarShape
        avatarColor
        avatarFace
        isAvatarAnimated
      }
      aiChatDirectMessageAssistantMode
      aiChatInboxAssistantMode
      aiAgentModelTier
      isAutoModelSelectionEnabled
      aiModelIdByTier
      aiAdditionalInstructions
      aiDataPolicy {
        requiredDataResidencyRegion
        isZeroDataRetentionRequired
        isProductImprovementDataSharingEnabled
      }
      isTwoFactorAuthenticationEnforced
      trashRetentionDays
      editableProfileFields
      isInternalMessagesImportEnabled
    }
    availableWorkspaces {
      ...AvailableWorkspacesFragment
    }
    userVars
  }
`;
