// Field set of the `/client-config` response the front reads
// (crm-front ClientConfig type). Nested shapes only cover what this
// backend ever returns.
export type ClientConfig = {
  aiModels: never[];
  aiEvaluationModels: never[];
  aiModelTiers: never[];
  authProviders: {
    google: boolean;
    magicLink: boolean;
    password: boolean;
    microsoft: boolean;
    sso: never[];
  };
  signInPrefilled: boolean;
  isMultiWorkspaceEnabled: boolean;
  isEmailVerificationRequired: boolean;
  defaultSubdomain: string;
  frontDomain: string;
  serverUrl: string;
  publicFunctionDomain: string | null;
  captcha: { provider?: string; siteKey?: string };
  api: { mutationMaximumAffectedRecords: number };
  isAttachmentPreviewEnabled: boolean;
  canManageFeatureFlags: boolean;
  publicFeatureFlags: never[];
  isCookieSessionEnabled: boolean;
  isMicrosoftMessagingEnabled: boolean;
  isMicrosoftCalendarEnabled: boolean;
  isGoogleMessagingEnabled: boolean;
  isGoogleCalendarEnabled: boolean;
  isConfigVariablesInDbEnabled: boolean;
  isImapSmtpCaldavEnabled: boolean;
  isEmailingDomainInDemoMode: boolean;
  isCloudflareIntegrationEnabled: boolean;
  isWorkspaceSchemaDDLLocked: boolean;
  isOnboardingAiChatEnabled: boolean;
  isTwoFactorAuthenticationEnabled: boolean;
};
