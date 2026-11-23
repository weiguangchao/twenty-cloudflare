import { ONBOARDING_INVITE_TEAM_PENDING_USER_VAR_KEY } from '@/onboarding/constants/OnboardingInviteTeamPendingUserVarKey';
import { getIsLastOnboardingStep } from '@/onboarding/utils/getIsLastOnboardingStep';
import { OnboardingStatus } from '~/generated-metadata/graphql';
import {
  mockCurrentWorkspace,
  mockedUserData,
} from '~/testing/mock-data/users';

type BuildArgsOptions = {
  onboardingStatus: OnboardingStatus;
  workspaceMembersCount?: number;
};

const buildArgs = ({
  onboardingStatus,
  workspaceMembersCount = 1,
}: BuildArgsOptions) => ({
  currentUser: { ...mockedUserData, onboardingStatus },
  currentWorkspace: {
    ...mockCurrentWorkspace,
    workspaceMembersCount,
  },
});

describe('getIsLastOnboardingStep', () => {
  it('should treat the invite step as the last one', () => {
    expect(
      getIsLastOnboardingStep(
        buildArgs({ onboardingStatus: OnboardingStatus.INVITE_TEAM }),
      ),
    ).toBe(true);
  });

  it('should treat profile creation as the last step for someone joining a team', () => {
    expect(
      getIsLastOnboardingStep(
        buildArgs({
          onboardingStatus: OnboardingStatus.PROFILE_CREATION,
          workspaceMembersCount: 3,
        }),
      ),
    ).toBe(true);
  });

  it('should treat profile creation as the last step when the invite step was not offered', () => {
    expect(
      getIsLastOnboardingStep(
        buildArgs({ onboardingStatus: OnboardingStatus.PROFILE_CREATION }),
      ),
    ).toBe(true);
  });

  it('should not treat profile creation as the last step when the invite step was offered', () => {
    expect(
      getIsLastOnboardingStep({
        ...buildArgs({ onboardingStatus: OnboardingStatus.PROFILE_CREATION }),
        currentUser: {
          ...mockedUserData,
          onboardingStatus: OnboardingStatus.PROFILE_CREATION,
          userVars: {
            [ONBOARDING_INVITE_TEAM_PENDING_USER_VAR_KEY]: true,
          },
        },
      }),
    ).toBe(false);
  });

  it('should not treat an intermediate step as the last one', () => {
    expect(
      getIsLastOnboardingStep(
        buildArgs({ onboardingStatus: OnboardingStatus.SYNC_EMAIL }),
      ),
    ).toBe(false);
  });
});
