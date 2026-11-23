import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { SettingsOptionCardContentCounter } from '@/settings/components/SettingsOptions/SettingsOptionCardContentCounter';
import { SettingsRoleDefaultRole } from '@/settings/roles/components/SettingsRolesDefaultRole';
import { SettingsRolesQueryEffect } from '@/settings/roles/components/SettingsRolesQueryEffect';
import { useSettingsAllRoles } from '@/settings/roles/hooks/useSettingsAllRoles';
import { SettingsSecurityAuthProvidersOptionsList } from '@/settings/security/components/SettingsSecurityAuthProvidersOptionsList';
import { SettingsSecurityEditableProfileFields } from '@/settings/security/components/SettingsSecurityEditableProfileFields';
import { SettingsSecurityIframeMediaPermissions } from '@/settings/security/components/SettingsSecurityIframeMediaPermissions';
import { SettingsSecurityIframeOrigins } from '@/settings/security/components/SettingsSecurityIframeOrigins';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useMutation } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useToast } from 'twenty-ui/components/feedback';
import { Section } from 'twenty-ui/components/layout';
import { IconTrash } from 'twenty-ui/icon';
import { Card } from 'twenty-ui/primitives/surfaces';
import { themeCssVariables } from 'twenty-ui/theme';
import { useDebouncedCallback } from 'use-debounce';
import { UpdateWorkspaceDocument } from '~/generated-metadata/graphql';

import { getToastOptionsFromError } from '@/error-handler/utils/getToastOptionsFromError';

const StyledContainer = styled.div`
  width: 100%;
`;

const StyledMainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[10]};
  min-height: 200px;
`;

export const SettingsSecuritySettings = () => {
  const { t } = useLingui();
  const { enqueueToast } = useToast();

  const [currentWorkspace, setCurrentWorkspace] = useAtomState(
    currentWorkspaceState,
  );
  const [updateWorkspace] = useMutation(UpdateWorkspaceDocument);

  const saveTrashRetention = useDebouncedCallback(async (value: number) => {
    try {
      await updateWorkspace({
        variables: {
          input: {
            trashRetentionDays: value,
          },
        },
      });
    } catch (err) {
      enqueueToast(getToastOptionsFromError({ error: err }));
    }
  }, 500);

  const handleTrashRetentionDaysChange = (value: number) => {
    if (!currentWorkspace) {
      return;
    }

    if (value === currentWorkspace.trashRetentionDays) {
      return;
    }

    setCurrentWorkspace({
      ...currentWorkspace,
      trashRetentionDays: value,
    });

    saveTrashRetention(value);
  };

  const roles = useSettingsAllRoles();

  return (
    <>
      <SettingsRolesQueryEffect />
      <StyledMainContent>
        <Section.Root>
          <StyledContainer>
            <Section.Header
              title={t`Authentication`}
              description={t`Customize your workspace security`}
            />
            <SettingsSecurityAuthProvidersOptionsList />
          </StyledContainer>
        </Section.Root>
        <SettingsSecurityIframeOrigins />
        <SettingsSecurityIframeMediaPermissions />
        <Section.Root>
          <Section.Header
            title={t`Other`}
            description={t`Other security settings`}
          />
          <Card.Root>
            <SettingsRoleDefaultRole roles={roles} divider />
            <SettingsSecurityEditableProfileFields divider />
            <SettingsOptionCardContentCounter
              Icon={IconTrash}
              title={t`Erasure of soft-deleted records`}
              description={t`Permanent deletion. Enter the number of days.`}
              value={currentWorkspace?.trashRetentionDays ?? 14}
              onChange={handleTrashRetentionDaysChange}
              minValue={0}
              showButtons={false}
            />
          </Card.Root>
        </Section.Root>
      </StyledMainContent>
    </>
  );
};
