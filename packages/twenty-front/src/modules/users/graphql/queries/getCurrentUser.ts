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

  fragment RowLevelPermissionPredicateFragment on RowLevelPermissionPredicate {
    id
    fieldMetadataId
    relationFieldMetadataId
    objectMetadataId
    operand
    subFieldName
    workspaceMemberFieldMetadataId
    workspaceMemberSubFieldName
    rowLevelPermissionPredicateGroupId
    positionInRowLevelPermissionPredicateGroup
    roleId
    value
  }

  fragment RowLevelPermissionPredicateGroupFragment on RowLevelPermissionPredicateGroup {
    id
    parentRowLevelPermissionPredicateGroupId
    logicalOperator
    positionInRowLevelPermissionPredicateGroup
    canReadRecords
    canUpdateRecords
    canSoftDeleteRecords
    canDestroyRecords
    roleId
    objectMetadataId
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

  fragment CurrentBillingSubscriptionFragment on BillingSubscription {
    id
    status
    interval
    metadata
    currentPeriodEnd
    cancelAt
    collectionMethod
    hasUserCredits
    phases {
      ...BillingSubscriptionSchedulePhaseFragment
    }
    billingSubscriptionItems {
      id
      hasReachedCurrentPeriodCap
      quantity
      stripePriceId
      unitAmount
      creditAmount
      billingProduct {
        name
        description
        images
        metadata {
          productKey
          planKey
          priceUsageBased
          isLegacy
        }
      }
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
    sso {
      type
      id
      issuer
      name
      status
    }
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
        rowLevelRecordsPermissions {
          canCreateRecords
          canReadRecords
          canUpdateRecords
          canSoftDeleteRecords
          canDestroyRecords
          predicates {
            ...RowLevelPermissionPredicateFragment
          }
          predicateGroups {
            ...RowLevelPermissionPredicateGroupFragment
          }
        }
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
      allowImpersonation
      activationStatus
      isPublicInviteLinkEnabled
      isCampaignClickTrackingEnabled
      isCampaignOpenTrackingEnabled
      workspaceDiscoverability
      isGoogleAuthEnabled
      isMicrosoftAuthEnabled
      isPasswordAuthEnabled
      isGoogleAuthBypassEnabled
      isMicrosoftAuthBypassEnabled
      isPasswordAuthBypassEnabled
      subdomain
      customDomain
      hasValidSignedEnterpriseKey
      hasValidEnterpriseValidityToken
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
      currentBillingSubscription {
        ...CurrentBillingSubscriptionFragment
      }
      billingCustomer {
        id
        hasPaymentMethod
        userCreditsFallback
      }
      billingSubscriptions {
        ...BillingSubscriptionFragment
      }
      billingEntitlements {
        key
        value
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
      eventLogRetentionDays
      editableProfileFields
      isInternalMessagesImportEnabled
    }
    availableWorkspaces {
      ...AvailableWorkspacesFragment
    }
    userVars
  }
`;
