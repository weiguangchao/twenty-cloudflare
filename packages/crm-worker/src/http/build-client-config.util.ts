import { oauthProviders } from '@/auth/oauth/oauth-provider.util';
import { type ClientConfig } from '@/http/types/client-config.type';
import { MUTATION_MAXIMUM_AFFECTED_RECORDS } from '@/workspace/record-api/mutations/record-mutation.constants';

export const buildClientConfig = (
  requestUrl: URL,
  env?: Env,
): ClientConfig => ({
  aiModels: [],
  aiEvaluationModels: [],
  aiModelTiers: [],
  authProviders: oauthProviders(env),
  signInPrefilled: false,
  isMultiWorkspaceEnabled: false,
  isEmailVerificationRequired: env?.EMAIL_VERIFICATION_REQUIRED === 'true',
  defaultSubdomain: 'app',
  frontDomain: requestUrl.hostname,
  serverUrl: requestUrl.origin,
  publicFunctionDomain: null,
  captcha: {},
  api: { mutationMaximumAffectedRecords: MUTATION_MAXIMUM_AFFECTED_RECORDS },
  isAttachmentPreviewEnabled: true,
  canManageFeatureFlags: false,
  publicFeatureFlags: [],
  isCookieSessionEnabled: true,
  isMicrosoftMessagingEnabled: false,
  isMicrosoftCalendarEnabled: false,
  isGoogleMessagingEnabled: false,
  isGoogleCalendarEnabled: false,
  isConfigVariablesInDbEnabled: false,
  isImapSmtpCaldavEnabled: false,
  isEmailingDomainInDemoMode: false,
  isCloudflareIntegrationEnabled: false,
  isWorkspaceSchemaDDLLocked: false,
  isOnboardingAiChatEnabled: false,
  isTwoFactorAuthenticationEnabled: false,
});
