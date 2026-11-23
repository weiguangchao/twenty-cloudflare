import { useIsLogged } from '@/auth/hooks/useIsLogged';
import { useDefaultHomePagePath } from '@/navigation/hooks/useDefaultHomePagePath';
import { useOnboardingStatus } from '@/onboarding/hooks/useOnboardingStatus';
import { useIsWorkspaceActivationStatusEqualsTo } from '@/workspace/hooks/useIsWorkspaceActivationStatusEqualsTo';
import { useQuery } from '@apollo/client/react';
import { useLocation } from 'react-router-dom';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { AppPath } from 'crm-shared/types';
import { getAppPath } from 'crm-shared/utils';
import { OnboardingStatus, PageLayoutType } from '~/generated-metadata/graphql';
import { useIsCurrentLocationOnAWorkspace } from '@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace';
import { usePageChangeEffectNavigateLocation } from '@/app/hooks/usePageChangeEffectNavigateLocation';
import { isMatchingLocation } from '~/utils/isMatchingLocation';

jest.mock('@/onboarding/hooks/useOnboardingStatus');
const setupMockOnboardingStatus = (
  onboardingStatus: OnboardingStatus | undefined,
) => {
  jest.mocked(useOnboardingStatus).mockReturnValueOnce(onboardingStatus);
};

jest.mock('@/workspace/hooks/useIsWorkspaceActivationStatusEqualsTo');
const setupMockIsWorkspaceActivationStatusEqualsTo = (
  isWorkspaceSuspended: boolean,
) => {
  jest
    .mocked(useIsWorkspaceActivationStatusEqualsTo)
    .mockReturnValueOnce(isWorkspaceSuspended);
};

jest.mock('~/utils/isMatchingLocation');
const mockIsMatchingLocation = jest.mocked(isMatchingLocation);

const setupMockIsMatchingLocation = (pathname: string) => {
  mockIsMatchingLocation.mockImplementation(
    (_location, path) => path === pathname,
  );
};

jest.mock('@/auth/hooks/useIsLogged');
const setupMockIsLogged = (isLogged: boolean) => {
  jest.mocked(useIsLogged).mockReturnValueOnce(isLogged);
};

const defaultHomePagePath = '/objects/companies';

jest.mock('@/navigation/hooks/useDefaultHomePagePath');
jest.mocked(useDefaultHomePagePath).mockReturnValue({
  defaultHomePagePath,
});

jest.mock('@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace');
const setupMockIsOnAWorkspace = (isOnAWorkspace: boolean) => {
  jest.mocked(useIsCurrentLocationOnAWorkspace).mockReturnValue({
    isOnAWorkspace,
  });
};

jest.mock('@apollo/client/react');
const setupMockUseQuery = (result?: { data?: unknown; loading?: boolean }) => {
  jest.mocked(useQuery).mockReturnValueOnce({
    data: result?.data ?? undefined,
    loading: result?.loading ?? false,
  } as ReturnType<typeof useQuery>);
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

const setupMockUseLocation = (
  loc: AppPath,
  objectNamePlural?: string,
  pageLayoutId?: string,
) => {
  const pathname =
    loc === AppPath.RecordIndexPage
      ? getAppPath(AppPath.RecordIndexPage, {
          objectNamePlural: objectNamePlural ?? 'default-object',
        })
      : loc === AppPath.PageLayoutPage && pageLayoutId
        ? getAppPath(AppPath.PageLayoutPage, { pageLayoutId })
        : loc === AppPath.PageLayoutPage
          ? '/page-layout'
          : loc;

  jest.mocked(useLocation).mockReturnValueOnce({
    pathname,
    search: '',
    hash: '',
    state: null,
    key: 'test-location',
  });
};

jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue');
const setupMockState = (
  objectNamePlural?: string,
  verifyEmailRedirectPath?: string,
  returnToPath?: string,
  currentWorkspace: object | null = { id: 'mock-workspace-id' },
  isMinimalMetadataReady: boolean = true,
) => {
  jest
    .mocked(useAtomStateValue)
    .mockReturnValueOnce(currentWorkspace)
    .mockReturnValueOnce([{ namePlural: objectNamePlural ?? '' }])
    .mockReturnValueOnce(isMinimalMetadataReady)
    .mockReturnValueOnce(returnToPath ?? '');
};

// prettier-ignore
const testCases: {
  loc: AppPath;
  isLogged: boolean;
  isWorkspaceSuspended: boolean;
  onboardingStatus: OnboardingStatus | undefined;
  res: string | undefined;
  isOnAWorkspace?: boolean;
  objectNamePluralFromParams?: string;
  objectNamePluralFromMetadata?: string;
  verifyEmailRedirectPath?: string;
  returnToPath?: string;
  pageLayoutId?: string;
  useQueryResult?: { data?: unknown; loading?: boolean };
  isMinimalMetadataReady?: boolean;
  shouldOpenGettingStartedResult?: { shouldOpenGettingStarted: boolean; isLoading: boolean };
}[] = [
  { loc: AppPath.Verify, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: undefined },
  { loc: AppPath.Verify, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.Verify, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.Verify, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.Verify, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },
  { loc: AppPath.SignInUp, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: undefined },
  { loc: AppPath.SignInUp, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.SignInUp, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.SignInUp, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.SignInUp, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },
  { loc: AppPath.Invite, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: undefined },
  { loc: AppPath.Invite, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: '/workspace-activation' },
  { loc: AppPath.Invite, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: '/create/profile' },
  { loc: AppPath.Invite, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: '/invite-team' },
  { loc: AppPath.Invite, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },
  { loc: AppPath.ResetPassword, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: undefined },
  { loc: AppPath.ResetPassword, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: '/workspace-activation' },
  { loc: AppPath.ResetPassword, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: '/create/profile' },
  { loc: AppPath.ResetPassword, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: '/invite-team' },
  { loc: AppPath.ResetPassword, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.VerifyEmail, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, verifyEmailRedirectPath: '/nextPath?key=value', res: undefined },
  { loc: AppPath.VerifyEmail, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: undefined },
  { loc: AppPath.VerifyEmail, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.VerifyEmail, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.VerifyEmail, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.VerifyEmail, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },
  { loc: AppPath.WorkspaceActivation, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.WorkspaceActivation, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: undefined },
  { loc: AppPath.WorkspaceActivation, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.WorkspaceActivation, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.WorkspaceActivation, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },
  { loc: AppPath.CreateProfile, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.CreateProfile, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.CreateProfile, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: undefined },
  { loc: AppPath.CreateProfile, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.CreateProfile, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },
  { loc: AppPath.InviteTeam, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.InviteTeam, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.InviteTeam, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.InviteTeam, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: undefined },
  { loc: AppPath.Index, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.Index, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.Index, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.Index, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.Index, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },
  { loc: AppPath.TasksPage, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.TasksPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.TasksPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.TasksPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.TasksPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.Home, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.Home, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.Home, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.Home, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.Home, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.OpportunitiesPage, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.OpportunitiesPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.OpportunitiesPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.OpportunitiesPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.OpportunitiesPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.RecordIndexPage, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.RecordIndexPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.RecordIndexPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.RecordIndexPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.RecordIndexPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.RecordIndexPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined, objectNamePluralFromParams: 'existing-object', objectNamePluralFromMetadata: 'existing-object' },
  { loc: AppPath.RecordIndexPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: AppPath.NotFound, objectNamePluralFromParams: 'non-existing-object', objectNamePluralFromMetadata: 'existing-object' },
  { loc: AppPath.RecordIndexPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined, objectNamePluralFromParams: 'non-existing-object', objectNamePluralFromMetadata: 'existing-object', isMinimalMetadataReady: false },
  { loc: AppPath.RecordShowPage, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.RecordShowPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.RecordShowPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.RecordShowPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.RecordShowPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.PageLayoutPage, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.PageLayoutPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.PageLayoutPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.PageLayoutPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.PageLayoutPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.PageLayoutPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined, pageLayoutId: 'valid-id', useQueryResult: { loading: true } },
  { loc: AppPath.PageLayoutPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: AppPath.NotFound, pageLayoutId: 'non-existent-id', useQueryResult: { data: { getPageLayout: null }, loading: false } },
  { loc: AppPath.PageLayoutPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: AppPath.NotFound, pageLayoutId: 'wrong-type-id', useQueryResult: { data: { getPageLayout: { type: PageLayoutType.RECORD_PAGE } }, loading: false } },
  { loc: AppPath.PageLayoutPage, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined, pageLayoutId: 'valid-standalone-id', useQueryResult: { data: { getPageLayout: { type: PageLayoutType.STANDALONE_PAGE } }, loading: false } },
  { loc: AppPath.SettingsCatchAll, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.SettingsCatchAll, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.SettingsCatchAll, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.SettingsCatchAll, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.SettingsCatchAll, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.DevelopersCatchAll, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.DevelopersCatchAll, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.DevelopersCatchAll, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.DevelopersCatchAll, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.DevelopersCatchAll, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.Authorize, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.Authorize, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.Authorize, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.Authorize, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.Authorize, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.NotFoundWildcard, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.NotFoundWildcard, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.NotFoundWildcard, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.NotFoundWildcard, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.NotFoundWildcard, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.NotFound, isLogged: false, isWorkspaceSuspended: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.NotFound, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.NotFound, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.NotFound, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.NotFound, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },

  { loc: AppPath.InviteTeam, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },

  // returnToPath: should redirect to saved path instead of defaultHomePagePath
  { loc: AppPath.Verify, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, returnToPath: '/authorize?clientId=abc', res: '/authorize?clientId=abc' },
  { loc: AppPath.SignInUp, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, returnToPath: '/objects/tasks', res: '/objects/tasks' },

  // isOnAWorkspace:false — on default domain, don't redirect to returnToPath or defaultHomePagePath from auth pages
  { loc: AppPath.Verify, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, isOnAWorkspace: false, res: undefined },
  { loc: AppPath.SignInUp, isLogged: true, isWorkspaceSuspended: false, onboardingStatus: OnboardingStatus.COMPLETED, isOnAWorkspace: false, res: undefined },
];

describe('usePageChangeEffectNavigateLocation', () => {
  it.each(testCases)(
    'with location $loc and onboardingStatus $onboardingStatus and isWorkspaceSuspended $isWorkspaceSuspended should return $res`',
    ({
      loc,
      onboardingStatus,
      isWorkspaceSuspended,
      isLogged,
      isOnAWorkspace,
      objectNamePluralFromParams,
      objectNamePluralFromMetadata,
      verifyEmailRedirectPath,
      returnToPath,
      pageLayoutId,
      useQueryResult,
      isMinimalMetadataReady,
      res,
    }) => {
      setupMockIsMatchingLocation(loc);
      setupMockOnboardingStatus(onboardingStatus);
      setupMockIsWorkspaceActivationStatusEqualsTo(isWorkspaceSuspended);
      setupMockIsLogged(isLogged);
      setupMockIsOnAWorkspace(isOnAWorkspace ?? true);
      setupMockUseQuery(useQueryResult);
      setupMockUseLocation(loc, objectNamePluralFromParams, pageLayoutId);
      setupMockState(
        objectNamePluralFromMetadata ??
          (loc === AppPath.RecordIndexPage ? 'default-object' : undefined),
        verifyEmailRedirectPath,
        returnToPath,
        undefined,
        isMinimalMetadataReady ?? true,
      );

      expect(usePageChangeEffectNavigateLocation()).toEqual(res);
    },
  );
});

describe('usePageChangeEffectNavigateLocation — authenticated with no current workspace', () => {
  it.each([AppPath.Index, AppPath.TasksPage, AppPath.SettingsCatchAll])(
    'redirects to SignInUp from %s when authenticated with no current workspace',
    (loc) => {
      setupMockIsMatchingLocation(loc);
      setupMockOnboardingStatus(undefined);
      setupMockIsWorkspaceActivationStatusEqualsTo(false);
      setupMockIsLogged(true);
      setupMockIsOnAWorkspace(true);
      setupMockUseQuery();
      setupMockUseLocation(loc);
      setupMockState(undefined, undefined, undefined, null);

      expect(usePageChangeEffectNavigateLocation()).toEqual(AppPath.SignInUp);
    },
  );
});
