export type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  locale: string;
  isEmailVerified: number;
  disabled: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceRow = {
  id: string;
  displayName: string;
  origin: string;
  subdomain: string;
  logo: string | null;
  inviteHash: string;
  isPublicInviteLinkEnabled: number;
  creatorUserId: string;
  activationStatus: string;
  defaultRoleId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserWorkspaceRow = {
  id: string;
  userId: string;
  workspaceId: string;
  workspaceMemberId: string;
  profilePending: number;
  inviteTeamPending: number;
  previousOnboardingStatus: string | null;
  createdAt: string;
};
