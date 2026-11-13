import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsRoleRouteGuard } from '@/settings/roles/components/SettingsRoleRouteGuard';
import { SettingsRolePermissionsObjectLevelObjectPicker } from '@/settings/roles/role-permissions/object-level-permissions/components/SettingsRolePermissionsObjectLevelObjectPicker';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { SettingsWizardStepBar } from '@/settings/components/layout/SettingsWizardStepBar';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { Navigate, useParams } from 'react-router-dom';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme';
import { useLingui } from '@lingui/react/macro';

export const SettingsRoleAddObjectLevel = () => {
  const { t } = useLingui();
  const { roleId } = useParams();

  const settingsDraftRole = useAtomFamilyStateValue(
    settingsDraftRoleFamilyState,
    roleId ?? '',
  );

  if (!roleId) {
    return <Navigate to={getSettingsPath(SettingsPath.Roles)} />;
  }

  const breadcrumbLinks = [
    {
      children: t`Workspace`,
      href: getSettingsPath(SettingsPath.General),
    },
    {
      children: t`Members`,
      href: getSettingsPath(SettingsPath.WorkspaceMembersPage),
    },
    { children: t`Roles`, href: getSettingsPath(SettingsPath.Roles) },
    {
      children: settingsDraftRole.label ?? '',
      href: getSettingsPath(SettingsPath.RoleDetail, { roleId }),
    },
    {
      children: t`Add object permission`,
      href: getSettingsPath(SettingsPath.RoleAddObjectLevel, { roleId }),
    },
  ];

  const headerTitle = settingsDraftRole.label ?? '';

  return (
    <SettingsRoleRouteGuard roleId={roleId}>
      <SettingsPageLayout
        title={headerTitle}
        titleColor={themeCssVariables.font.color.tertiary}
        links={breadcrumbLinks}
        secondaryBar={<SettingsWizardStepBar label={t`1. Select an object`} />}
      >
        <SettingsPageContainer>
          <SettingsRolePermissionsObjectLevelObjectPicker roleId={roleId} />
        </SettingsPageContainer>
      </SettingsPageLayout>
    </SettingsRoleRouteGuard>
  );
};
