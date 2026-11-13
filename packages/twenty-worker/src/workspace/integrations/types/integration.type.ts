export type ApiKeyRow = {
  id: string;
  name: string;
  roleId: string;
  tokenHash: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type WebhookRow = {
  id: string;
  targetUrl: string;
  operations: string;
  description: string | null;
  secret: string;
  roleId: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
