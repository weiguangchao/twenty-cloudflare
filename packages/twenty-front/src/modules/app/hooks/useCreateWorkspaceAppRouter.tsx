import { lazy, useMemo } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { LazyRoute } from '@/app/components/LazyRoute';
import { WorkspaceAppProviders } from '@/app/components/WorkspaceAppProviders';
import { WorkspaceRouteObjectsProvider } from '@/app/routing/components/WorkspaceRouteObjectsProvider';
import { createWorkspaceRouteObjects } from '@/app/routing/utils/createWorkspaceRouteObjects';
import { getWorkspaceRouteObjectsForSurface } from '@/app/routing/utils/getWorkspaceRouteObjectsForSurface';
import { VerifyEmail } from '@/auth/components/VerifyEmail';
import { AppRouteErrorFallback } from '@/error-handler/components/AppRouteErrorFallback';
import { MinimalMetadataGate } from '@/metadata-store/components/MinimalMetadataGate';
import { OnboardingActivationOutlet } from '@/onboarding/components/OnboardingActivationOutlet';
import { OnboardingPageLoader } from '@/onboarding/components/OnboardingPageLoader';
import { OnboardingStepLayout } from '@/onboarding/components/OnboardingStepLayout';
import { OnboardingStepPageLoader } from '@/onboarding/components/OnboardingStepPageLoader';
import { OnboardingTransitionOutlet } from '@/onboarding/components/OnboardingTransitionOutlet';
import { AuthFlowLayout } from '@/ui/layout/page/components/AuthFlowLayout';
import { BlankLayout } from '@/ui/layout/page/components/BlankLayout';
import { DefaultLayout } from '@/app/components/DefaultLayout';
import { MainAppLayoutWithSidePanel } from '@/app/components/MainAppLayoutWithSidePanel';
import { Verify } from '~/pages/onboarding/Verify';
import { lazyWithPreload } from '~/utils/lazyWithPreload';

const SignInUp = lazy(() =>
  import('~/pages/auth/SignInUp').then((module) => ({
    default: module.SignInUp,
  })),
);

const PasswordReset = lazy(() =>
  import('~/pages/auth/PasswordReset').then((module) => ({
    default: module.PasswordReset,
  })),
);

const McpAuthorize = lazy(() =>
  import('~/pages/auth/McpAuthorize').then((module) => ({
    default: module.McpAuthorize,
  })),
);

const WorkspaceActivation = lazyWithPreload(() =>
  import('~/pages/onboarding/WorkspaceActivation').then((module) => ({
    default: module.WorkspaceActivation,
  })),
);

const CreateProfile = lazyWithPreload(() =>
  import('~/pages/onboarding/CreateProfile').then((module) => ({
    default: module.CreateProfile,
  })),
);

const InviteTeam = lazyWithPreload(() =>
  import('~/pages/onboarding/InviteTeam').then((module) => ({
    default: module.InviteTeam,
  })),
);

const preloadOnboardingPages = () => {
  WorkspaceActivation.preload();
  CreateProfile.preload();
  InviteTeam.preload();

  return null;
};

type CreateWorkspaceAppRouterArgs = {
  isAdminPageEnabled?: boolean;
};

const createWorkspaceAppRouter = ({
  isAdminPageEnabled,
}: CreateWorkspaceAppRouterArgs) => {
  const workspaceRouteObjects = createWorkspaceRouteObjects({
    isAdminPageEnabled,
  });

  return createBrowserRouter([
    {
      element: (
        <WorkspaceRouteObjectsProvider routeObjects={workspaceRouteObjects} />
      ),
      errorElement: <AppRouteErrorFallback />,
      children: [
        {
          element: <WorkspaceAppProviders />,
          loader: async () => Promise.resolve(null),
          children: [
            {
              element: <MinimalMetadataGate />,
              children: [
                {
                  element: <DefaultLayout />,
                  children: [
                    {
                      element: <MainAppLayoutWithSidePanel />,
                      children: getWorkspaceRouteObjectsForSurface(
                        workspaceRouteObjects,
                        'main',
                      ),
                    },
                  ],
                },
              ],
            },
            {
              element: <AuthFlowLayout />,
              children: [
                {
                  path: AppPath.Authorize,
                  element: (
                    <LazyRoute fallback={null}>
                      <McpAuthorize />
                    </LazyRoute>
                  ),
                },
                { path: AppPath.VerifyEmail, element: <VerifyEmail /> },
                {
                  path: AppPath.ResetPassword,
                  element: (
                    <LazyRoute fallback={null}>
                      <PasswordReset />
                    </LazyRoute>
                  ),
                },
              ],
            },
            {
              element: <BlankLayout />,
              children: [
                {
                  element: <OnboardingTransitionOutlet />,
                  loader: preloadOnboardingPages,
                  children: [
                    {
                      path: AppPath.SignInUp,
                      element: (
                        <LazyRoute fallback={<OnboardingPageLoader />}>
                          <SignInUp />
                        </LazyRoute>
                      ),
                    },
                    {
                      path: AppPath.Invite,
                      element: (
                        <LazyRoute fallback={<OnboardingPageLoader />}>
                          <SignInUp />
                        </LazyRoute>
                      ),
                    },
                  ],
                },
                {
                  element: <OnboardingActivationOutlet />,
                  loader: preloadOnboardingPages,
                  children: [
                    { path: AppPath.Verify, element: <Verify /> },
                    {
                      path: AppPath.WorkspaceActivation,
                      element: (
                        <LazyRoute fallback={null}>
                          <WorkspaceActivation />
                        </LazyRoute>
                      ),
                    },
                  ],
                },
                {
                  element: <OnboardingStepLayout />,
                  loader: preloadOnboardingPages,
                  children: [
                    {
                      path: AppPath.CreateProfile,
                      element: (
                        <LazyRoute fallback={<OnboardingStepPageLoader />}>
                          <CreateProfile />
                        </LazyRoute>
                      ),
                    },
                    {
                      path: AppPath.InviteTeam,
                      element: (
                        <LazyRoute fallback={<OnboardingStepPageLoader />}>
                          <InviteTeam />
                        </LazyRoute>
                      ),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);
};

export const useCreateWorkspaceAppRouter = ({
  isAdminPageEnabled,
}: CreateWorkspaceAppRouterArgs) =>
  useMemo(
    () => createWorkspaceAppRouter({ isAdminPageEnabled }),
    [isAdminPageEnabled],
  );
