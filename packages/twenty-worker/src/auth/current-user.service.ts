import {
  availableWorkspaces,
  requireWorkspace,
  workspaceUrls,
} from '@/auth/workspace-lifecycle.service';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { CUSTOM_APPLICATION_ID } from '@/workspace/metadata/constants/metadata-application-ids.constant';

export const currentUser = async (context: MetadataContext) => {
  const auth = await context.requireAuth();
  const user = (await context.store.userById(auth.userId))!;
  const available = await availableWorkspaces(context, user.id);
  const base = {
    ...user,
    isEmailVerified: Boolean(user.isEmailVerified),
    disabled: Boolean(user.disabled),
    hasPassword: true,
    canImpersonate: false,
    canAccessFullAdminPanel: false,
    userVars: {},
    workspaceMembers: [],
    deletedWorkspaceMembers: [],
    userWorkspaces: [],
    workspaces: [],
    availableWorkspaces: available,
    currentWorkspace: null,
    currentUserWorkspace: null,
    workspaceMember: null,
    onboardingStatus: null,
    previousOnboardingStatus: null,
    isWorkspaceCreator: null,
  };
  if (!auth.workspaceId) return base;

  const { workspace, membership } = await requireWorkspace(context);
  const memberships =
    workspace.activationStatus === 'ACTIVE'
      ? await context.store.membershipsForWorkspace(workspace.id)
      : [];
  const data =
    workspace.activationStatus === 'ACTIVE'
      ? await context.workspace(workspace.id).getWorkspaceAuthData(
          {
            workspaceMemberId: membership.workspaceMemberId,
            userWorkspaceId: membership.id,
          },
          memberships.map((member) => ({
            userWorkspaceId: member.id,
            workspaceMemberId: member.workspaceMemberId,
          })),
          workspace.defaultRoleId,
        )
      : null;
  const onboardingStatus =
    workspace.activationStatus !== 'ACTIVE'
      ? 'WORKSPACE_ACTIVATION'
      : membership.profilePending
        ? 'PROFILE_CREATION'
        : membership.inviteTeamPending
          ? 'INVITE_TEAM'
          : 'COMPLETED';

  return {
    ...base,
    userVars: {
      ONBOARDING_CREATE_PROFILE_PENDING: Boolean(membership.profilePending),
      ONBOARDING_INVITE_TEAM_PENDING: Boolean(membership.inviteTeamPending),
      ONBOARDING_CONNECT_ACCOUNT_PENDING: false,
      ONBOARDING_BOOK_CALL_PENDING: false,
    },
    workspaceMember: data?.member,
    workspaceMembers: data?.members ?? [],
    onboardingStatus,
    previousOnboardingStatus: membership.previousOnboardingStatus,
    isWorkspaceCreator: workspace.creatorUserId === user.id,
    currentUserWorkspace: {
      id: membership.id,
      userId: user.id,
      locale: user.locale,
      createdAt: membership.createdAt,
      updatedAt: user.updatedAt,
      user: { ...base, firstName: user.firstName, lastName: user.lastName },
      permissionFlags: data?.permissions.permissionFlags ?? [],
      isImpersonating: false,
      objectRecordsPermissions:
        data?.permissions.objectRecordsPermissions ?? [],
      twoFactorAuthenticationMethodSummary: [],
    },
    currentWorkspace: {
      ...workspace,
      allowImpersonation: false,
      isPublicInviteLinkEnabled: Boolean(workspace.isPublicInviteLinkEnabled),
      isCampaignClickTrackingEnabled: false,
      isCampaignOpenTrackingEnabled: false,
      workspaceDiscoverability: 'MEMBERS_AND_INVITEES',
      isGoogleAuthEnabled: false,
      isMicrosoftAuthEnabled: false,
      isPasswordAuthEnabled: true,
      isGoogleAuthBypassEnabled: false,
      isMicrosoftAuthBypassEnabled: false,
      isPasswordAuthBypassEnabled: false,
      isCustomDomainEnabled: false,
      isTwoFactorAuthenticationEnforced: false,
      isInternalMessagesImportEnabled: false,
      hasValidSignedEnterpriseKey: false,
      hasValidEnterpriseValidityToken: false,
      workspaceUrls: workspaceUrls(workspace),
      workspaceCustomApplication:
        data?.applications.find(
          (application) => application.id === CUSTOM_APPLICATION_ID,
        ) ?? null,
      installedApplications: data?.applications ?? [],
      featureFlags: data?.featureFlags ?? [],
      defaultRole: data?.defaultRole ?? null,
      workspaceMembersCount: memberships.length,
      aiChatModelTier: 'balanced',
      aiAgentModelTier: 'balanced',
      aiChatDirectMessageAssistantMode: 'NEVER',
      aiChatInboxAssistantMode: 'NEVER',
      aiChatAssistantProfile: {
        displayName: 'Assistant',
        avatarShape: 'circle',
        avatarColor: 'blue',
        avatarFace: 'smile',
        isAvatarAnimated: false,
      },
      isAutoModelSelectionEnabled: false,
      aiModelIdByTier: {},
      aiAdditionalInstructions: null,
      aiDataPolicy: null,
      currentBillingSubscription: null,
      billingSubscriptions: [],
      billingCustomer: null,
      billingEntitlements: [{ key: 'CUSTOM_ROLES', value: true }],
      isTrialAvailable: false,
      trashRetentionDays: workspace.trashRetentionDays,
      eventLogRetentionDays: 30,
      editableProfileFields: ['firstName', 'lastName', 'profilePicture'],
      iframeMediaPermissions: [],
    },
  };
};
