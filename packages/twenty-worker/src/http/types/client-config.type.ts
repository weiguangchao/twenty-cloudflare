// Field set of the `/client-config` response the front reads
// (twenty-front ClientConfig type). Nested shapes only cover what this
// backend ever returns.
export type ClientConfig = {
  billing: {
    isBillingEnabled: boolean;
    trialPeriods: { duration: number; isCreditCardRequired: boolean }[];
  };
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
  support: { supportDriver: 'NONE' };
  sentry: { dsn?: string; environment?: string; release?: string };
  captcha: { provider?: string; siteKey?: string };
  api: { mutationMaximumAffectedRecords: number };
  onboarding: null;
  isAttachmentPreviewEnabled: boolean;
  analyticsEnabled: boolean;
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
  allowRequestsToTwentyIcons: boolean;
  isBookCallOnboardingStepEnabled: boolean;
  isCompanyEnrichmentEnabled: boolean;
  isCloudflareIntegrationEnabled: boolean;
  isClickHouseConfigured: boolean;
  isWorkspaceSchemaDDLLocked: boolean;
  isOnboardingAiChatEnabled: boolean;
  isTwoFactorAuthenticationEnabled: boolean;
  enterpriseInstanceType: string;
};
