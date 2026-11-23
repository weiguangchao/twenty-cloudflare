import {
  type ApiConfig,
  type AuthProviders,
  type Captcha,
  type ClientAiEvaluationModelConfig,
  type ClientAiModelConfig,
  type ClientAiModelTierConfig,
  type ClientConfigMaintenanceMode,
  type PublicFeatureFlag,
} from '~/generated-metadata/graphql';

export type ClientConfig = {
  appVersion?: string;
  aiModels: Array<ClientAiModelConfig>;
  aiEvaluationModels: Array<ClientAiEvaluationModelConfig>;
  aiModelTiers: Array<ClientAiModelTierConfig>;
  api: ApiConfig;
  authProviders: AuthProviders;
  canManageFeatureFlags: boolean;
  captcha: Captcha;
  defaultSubdomain?: string;
  frontDomain: string;
  serverUrl: string;
  publicFunctionDomain?: string | null;
  isAttachmentPreviewEnabled: boolean;
  isConfigVariablesInDbEnabled: boolean;
  isEmailVerificationRequired: boolean;
  isGoogleCalendarEnabled: boolean;
  isGoogleMessagingEnabled: boolean;
  isMicrosoftCalendarEnabled: boolean;
  isMicrosoftMessagingEnabled: boolean;
  isMultiWorkspaceEnabled: boolean;
  isImapSmtpCaldavEnabled: boolean;
  isEmailingDomainInDemoMode: boolean;
  isCloudflareIntegrationEnabled: boolean;
  isWorkspaceSchemaDDLLocked: boolean;
  isOnboardingAiChatEnabled: boolean;
  publicFeatureFlags: Array<PublicFeatureFlag>;
  signInPrefilled: boolean;
  isTwoFactorAuthenticationEnabled: boolean;
  maintenance?: ClientConfigMaintenanceMode;
};
