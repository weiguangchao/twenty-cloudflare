export type AuthContext = {
  userId: string;
  sessionId: string;
  workspaceId: string | null;
  userWorkspaceId: string | null;
  workspaceMemberId: string | null;
};
