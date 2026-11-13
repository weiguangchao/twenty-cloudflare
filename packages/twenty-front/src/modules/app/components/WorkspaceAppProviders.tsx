import { StrictMode } from 'react';
import { Outlet } from 'react-router-dom';
import { TrackPageViewEffect } from '@/analytics/components/TrackPageViewEffect';
import { SharedAppProviders } from '@/app/components/SharedAppProviders';
import { WorkspaceAppPageTitle } from '@/app/components/WorkspaceAppPageTitle';
import { GotoHotkeysEffectsProvider } from '@/app/effect-components/GotoHotkeysEffectsProvider';
import { InitializeQueryParamStateEffect } from '@/app/effect-components/InitializeQueryParamStateEffect';
import { PageChangeEffect } from '@/app/effect-components/PageChangeEffect';
import { AuthProvider } from '@/auth/components/AuthProvider';
import { SignOutOnOtherTabSignOutEffect } from '@/auth/effect-components/SignOutOnOtherTabSignOutEffect';
import { CaptchaProvider } from '@/captcha/components/CaptchaProvider';
import { RequestFreshCaptchaTokenEffect } from '@/captcha/components/RequestFreshCaptchaTokenEffect';
import { CommandMenuConfirmationModalManager } from '@/command-menu-item/confirmation-modal/components/CommandMenuConfirmationModalManager';
import { CommandRunner } from '@/command-menu-item/engine-command/components/CommandRunner';
import { MAIN_CONTEXT_STORE_INSTANCE_ID } from '@/context-store/constants/MainContextStoreInstanceId';
import { ContextStoreComponentInstanceContext } from '@/context-store/states/contexts/ContextStoreComponentInstanceContext';
import { ErrorMessageEffect } from '@/error-handler/components/ErrorMessageEffect';
import { PromiseRejectionEffect } from '@/error-handler/components/PromiseRejectionEffect';
import { IsMinimalMetadataReadyEffect } from '@/metadata-store/effect-components/IsMinimalMetadataReadyEffect';
import { MinimalMetadataLoadEffect } from '@/metadata-store/effect-components/MinimalMetadataLoadEffect';
import { UserMetadataProviderInitialEffect } from '@/metadata-store/effect-components/UserMetadataProviderInitialEffect';
import { ApolloCoreProvider } from '@/object-metadata/components/ApolloCoreProvider';
import { RecordCreationFormProvider } from '@/object-record/record-form/components/RecordCreationFormProvider';
import { RecordUpdateFormProvider } from '@/object-record/record-form/components/RecordUpdateFormProvider';
import { SSEProvider } from '@/sse-db-event/components/SSEProvider';
import { SupportChatEffect } from '@/support/components/SupportChatEffect';
import { DialogManager } from '@/ui/feedback/dialog-manager/components/DialogManager';
import { DialogComponentInstanceContext } from '@/ui/feedback/dialog-manager/contexts/DialogComponentInstanceContext';
import { AppToaster } from '@/ui/feedback/toast/components/AppToaster';
import { GlobalFilePreviewModal } from '@/ui/field/display/components/GlobalFilePreviewModal';
import { UserThemeProviderEffect } from '@/workspace-member/effect-components/UserThemeProviderEffect';
import { UserUiScaleProviderEffect } from '@/workspace-member/effect-components/UserUiScaleProviderEffect';
import { PageFavicon } from '@/app/components/PageFavicon';
import { UserContextProvider } from '@/users/components/UserContextProvider';
import { WorkspaceProviderEffect } from '@/workspace/components/WorkspaceProviderEffect';

export const WorkspaceAppProviders = () => {
  return (
    <SharedAppProviders>
      <UserMetadataProviderInitialEffect />
      <MinimalMetadataLoadEffect />
      <IsMinimalMetadataReadyEffect />
      <WorkspaceProviderEffect />
      <CaptchaProvider>
        <UserContextProvider>
          <AuthProvider>
            <ApolloCoreProvider>
              <SSEProvider>
                <UserThemeProviderEffect />
                <UserUiScaleProviderEffect />
                <ContextStoreComponentInstanceContext.Provider
                  value={{ instanceId: MAIN_CONTEXT_STORE_INSTANCE_ID }}
                >
                  <AppToaster />
                  <ErrorMessageEffect />

                  <DialogComponentInstanceContext.Provider
                    value={{ instanceId: 'dialog-manager' }}
                  >
                    <DialogManager>
                      <StrictMode>
                        <PromiseRejectionEffect />

                        <GotoHotkeysEffectsProvider />
                        <WorkspaceAppPageTitle />
                        <PageFavicon />

                        <RecordCreationFormProvider>
                          <RecordUpdateFormProvider>
                            <Outlet />
                            <GlobalFilePreviewModal />
                            <CommandMenuConfirmationModalManager />
                            <CommandRunner />
                          </RecordUpdateFormProvider>
                        </RecordCreationFormProvider>
                      </StrictMode>
                    </DialogManager>
                  </DialogComponentInstanceContext.Provider>
                </ContextStoreComponentInstanceContext.Provider>
                <SupportChatEffect />
                <InitializeQueryParamStateEffect />
                <TrackPageViewEffect />
                <RequestFreshCaptchaTokenEffect />
                <PageChangeEffect />

                <SignOutOnOtherTabSignOutEffect />
              </SSEProvider>
            </ApolloCoreProvider>
          </AuthProvider>
        </UserContextProvider>
      </CaptchaProvider>
    </SharedAppProviders>
  );
};
