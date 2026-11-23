import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { Provider as JotaiProvider } from 'jotai';

import { currentUserState } from '@/auth/states/currentUserState';
import { currentUserWorkspaceState } from '@/auth/states/currentUserWorkspaceState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { isOnboardingAiChatEnabledState } from '@/client-config/states/isOnboardingAiChatEnabledState';
import { ONBOARDING_INVITE_TEAM_PENDING_USER_VAR_KEY } from '@/onboarding/constants/OnboardingInviteTeamPendingUserVarKey';
import { useSetNextOnboardingStatus } from '@/onboarding/hooks/useSetNextOnboardingStatus';
import { type OnboardingStepHistoryEffect } from '@/onboarding/types/OnboardingStepHistoryEffect';
import { shouldOpenAiChatAfterOnboardingState } from '@/onboarding/states/shouldOpenAiChatAfterOnboardingState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

import { OnboardingStatus } from '~/generated-metadata/graphql';
import {
  mockCurrentWorkspace,
  mockedUserData,
} from '~/testing/mock-data/users';

const Wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(JotaiProvider, { store: jotaiStore }, children);

type RenderHooksOptions = {
  withOneWorkspaceMember?: boolean;
  isOnboardingAiChatEnabled?: boolean;
  stepHistoryEffect?: OnboardingStepHistoryEffect;
  isInviteTeamOnboardingStepPending?: boolean;
  isWorkspaceCreator?: boolean;
};

const renderHooks = (
  onboardingStatus: OnboardingStatus | null,
  {
    withOneWorkspaceMember = true,
    isOnboardingAiChatEnabled = false,
    stepHistoryEffect = 'leaveUnchanged',
    isInviteTeamOnboardingStepPending = true,
    isWorkspaceCreator = true,
  }: RenderHooksOptions = {},
) => {
  jotaiStore.set(
    isOnboardingAiChatEnabledState.atom,
    isOnboardingAiChatEnabled,
  );

  const { result } = renderHook(
    () => {
      const [currentUser, setCurrentUser] = useAtomState(currentUserState);
      const setCurrentUserWorkspace = useSetAtomState(
        currentUserWorkspaceState,
      );
      const setCurrentWorkspace = useSetAtomState(currentWorkspaceState);
      const setNextOnboardingStatus = useSetNextOnboardingStatus();
      const shouldOpenAiChatAfterOnboarding = useAtomStateValue(
        shouldOpenAiChatAfterOnboardingState,
      );
      return {
        currentUser,
        setCurrentUser,
        setCurrentWorkspace,
        setCurrentUserWorkspace,
        setNextOnboardingStatus,
        shouldOpenAiChatAfterOnboarding,
      };
    },
    {
      wrapper: Wrapper,
    },
  );
  act(() => {
    result.current.setCurrentUser({
      ...mockedUserData,
      onboardingStatus,
      isWorkspaceCreator,
      userVars: {
        ...mockedUserData.userVars,
        [ONBOARDING_INVITE_TEAM_PENDING_USER_VAR_KEY]:
          isInviteTeamOnboardingStepPending,
      },
    });
    result.current.setCurrentUserWorkspace(mockedUserData.currentUserWorkspace);
    result.current.setCurrentWorkspace({
      ...mockCurrentWorkspace,
      workspaceMembersCount: withOneWorkspaceMember ? 1 : 2,
    });
  });
  act(() => {
    result.current.setNextOnboardingStatus({ stepHistoryEffect });
  });
  return {
    nextOnboardingStatus: result.current.currentUser?.onboardingStatus,
    previousOnboardingStatus:
      result.current.currentUser?.previousOnboardingStatus,
    shouldOpenAiChatAfterOnboarding:
      result.current.shouldOpenAiChatAfterOnboarding,
  };
};

describe('useSetNextOnboardingStatus', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    resetJotaiStore();
  });

  it('should sync emails right after workspace activation', () => {
    const { nextOnboardingStatus, shouldOpenAiChatAfterOnboarding } =
      renderHooks(OnboardingStatus.WORKSPACE_ACTIVATION);
    expect(nextOnboardingStatus).toEqual(OnboardingStatus.SYNC_EMAIL);
    expect(shouldOpenAiChatAfterOnboarding).toBe(false);
  });

  it('should create profile after syncing emails', () => {
    const { nextOnboardingStatus, shouldOpenAiChatAfterOnboarding } =
      renderHooks(OnboardingStatus.SYNC_EMAIL);
    expect(nextOnboardingStatus).toEqual(OnboardingStatus.PROFILE_CREATION);
    expect(shouldOpenAiChatAfterOnboarding).toBe(false);
  });

  it('should invite the team right after profile creation', () => {
    const { nextOnboardingStatus, shouldOpenAiChatAfterOnboarding } =
      renderHooks(OnboardingStatus.PROFILE_CREATION);
    expect(nextOnboardingStatus).toEqual(OnboardingStatus.INVITE_TEAM);
    expect(shouldOpenAiChatAfterOnboarding).toBe(false);
  });

  it('should skip the invite step after profile creation when the server did not flag it', () => {
    const { nextOnboardingStatus } = renderHooks(
      OnboardingStatus.PROFILE_CREATION,
      { isInviteTeamOnboardingStepPending: false },
    );
    expect(nextOnboardingStatus).toEqual(OnboardingStatus.COMPLETED);
  });

  it('should complete after profile creation when more than 1 workspaceMember exist', () => {
    const { nextOnboardingStatus, shouldOpenAiChatAfterOnboarding } =
      renderHooks(OnboardingStatus.PROFILE_CREATION, {
        withOneWorkspaceMember: false,
      });
    expect(nextOnboardingStatus).toEqual(OnboardingStatus.COMPLETED);
    expect(shouldOpenAiChatAfterOnboarding).toBe(false);
  });

  it('should complete after inviting the team', () => {
    const { nextOnboardingStatus, shouldOpenAiChatAfterOnboarding } =
      renderHooks(OnboardingStatus.INVITE_TEAM);
    expect(nextOnboardingStatus).toEqual(OnboardingStatus.COMPLETED);
    expect(shouldOpenAiChatAfterOnboarding).toBe(false);
  });

  it('should not open the ai chat when the onboarding was already completed', () => {
    const { nextOnboardingStatus, shouldOpenAiChatAfterOnboarding } =
      renderHooks(OnboardingStatus.COMPLETED);
    expect(nextOnboardingStatus).toEqual(OnboardingStatus.COMPLETED);
    expect(shouldOpenAiChatAfterOnboarding).toBe(false);
  });

  it('should not open the ai chat when the onboarding status is unknown', () => {
    const { nextOnboardingStatus, shouldOpenAiChatAfterOnboarding } =
      renderHooks(null);
    expect(nextOnboardingStatus).toEqual(OnboardingStatus.COMPLETED);
    expect(shouldOpenAiChatAfterOnboarding).toBe(false);
  });

  it('should open the ai chat after onboarding when it is enabled', () => {
    const { shouldOpenAiChatAfterOnboarding } = renderHooks(
      OnboardingStatus.INVITE_TEAM,
      {
        isOnboardingAiChatEnabled: true,
      },
    );
    expect(shouldOpenAiChatAfterOnboarding).toBe(true);
  });

  it('should not open the ai chat after onboarding for an invitee', () => {
    const { shouldOpenAiChatAfterOnboarding } = renderHooks(
      OnboardingStatus.INVITE_TEAM,
      {
        isOnboardingAiChatEnabled: true,
        isWorkspaceCreator: false,
      },
    );
    expect(shouldOpenAiChatAfterOnboarding).toBe(false);
  });

  it('should make the left step the one to go back to when it was reversible', () => {
    const { previousOnboardingStatus } = renderHooks(
      OnboardingStatus.SYNC_EMAIL,
      { stepHistoryEffect: 'recordAsReversible' },
    );
    expect(previousOnboardingStatus).toEqual(OnboardingStatus.SYNC_EMAIL);
  });

  it('should keep the earlier reversible step when the left step was not reversible', () => {
    const { previousOnboardingStatus } = renderHooks(
      OnboardingStatus.SYNC_EMAIL,
      { stepHistoryEffect: 'leaveUnchanged' },
    );
    expect(previousOnboardingStatus).toBeUndefined();
  });

  it('should drop every step to go back to after an irreversible step', () => {
    const { previousOnboardingStatus } = renderHooks(
      OnboardingStatus.INVITE_TEAM,
      { stepHistoryEffect: 'clearAfterIrreversibleStep' },
    );
    expect(previousOnboardingStatus).toBeNull();
  });

  it('should still sync emails when the server status landed before advancing', () => {
    jotaiStore.set(currentUserState.atom, {
      ...mockedUserData,
      onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION,
    });
    jotaiStore.set(currentWorkspaceState.atom, {
      ...mockCurrentWorkspace,
      workspaceMembersCount: 1,
    });

    const { result } = renderHook(() => useSetNextOnboardingStatus(), {
      wrapper: Wrapper,
    });

    const advanceCapturedBeforeActivation = result.current;

    act(() => {
      jotaiStore.set(currentUserState.atom, {
        ...mockedUserData,
        onboardingStatus: OnboardingStatus.SYNC_EMAIL,
      });
      advanceCapturedBeforeActivation({ stepHistoryEffect: 'leaveUnchanged' });
    });

    expect(jotaiStore.get(currentUserState.atom)?.onboardingStatus).toEqual(
      OnboardingStatus.SYNC_EMAIL,
    );
  });
});
