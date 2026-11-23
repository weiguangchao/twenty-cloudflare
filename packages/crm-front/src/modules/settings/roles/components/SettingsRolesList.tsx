import { SettingsRolesTableHeader } from '@/settings/roles/components/SettingsRolesTableHeader';
import { SettingsRolesTableRow } from '@/settings/roles/components/SettingsRolesTableRow';
import { useSettingsAllRoles } from '@/settings/roles/hooks/useSettingsAllRoles';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { Table } from '@/ui/layout/table/components/Table';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableFooter } from '@/ui/layout/table/components/TableFooter';
import { styled } from '@linaria/react';
import { useState } from 'react';
import { SettingsPath } from 'crm-shared/types';
import { Section } from 'crm-ui/components/layout';
import { Dropdown } from 'crm-ui/components/navigation';
import { SettingsRow } from 'crm-ui/components/settings';
import { IconFilter, IconKey, IconPlus, IconSearch } from 'crm-ui/icon';
import { Button } from 'crm-ui/primitives/input';
import { themeCssVariables } from 'crm-ui/theme';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';
import { sortByAscString } from '~/utils/array/sortByAscString';
import { useLingui } from '@lingui/react/macro';

const StyledTableRows = styled.div`
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
`;

const StyledSearchAndFilterContainer = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  margin-bottom: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledSearchInputContainer = styled.div`
  flex: 1;
`;

export const SettingsRolesList = () => {
  const { t } = useLingui();
  const navigateSettings = useNavigateSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [showApiKeyRoles, setShowApiKeyRoles] = useState(false);

  const settingsAllRoles = useSettingsAllRoles();

  const sortedSettingsAllRoles = [...settingsAllRoles].sort((a, b) =>
    sortByAscString(a.label, b.label),
  );

  const filteredRoles = sortedSettingsAllRoles.filter((role) => {
    const matchesType =
      role.canBeAssignedToUsers ||
      (showApiKeyRoles && role.canBeAssignedToApiKeys);

    const matchesSearch = role.label
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesType && matchesSearch;
  });

  return (
    <Section.Root>
      <Section.Header
        title={t`All roles`}
        description={t`Assign roles to specify access permissions`}
      />

      <StyledSearchAndFilterContainer>
        <StyledSearchInputContainer>
          <SettingsTextInput
            instanceId="settings-roles-search"
            LeftIcon={IconSearch}
            placeholder={t`Search a role...`}
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </StyledSearchInputContainer>
        <DropdownRoot dropdownId="settings-roles-filter-dropdown" type="panel">
          <Dropdown.Trigger
            render={
              <Button
                startIcon={<IconFilter />}
                size="md"
                aria-label={t`Filter`}
                variant="outline"
              />
            }
          />
          <DropdownContent align="end" sideOffset={8}>
            <Dropdown.Section>
              <SettingsRow
                startElement={<IconKey />}
                onCheckedChange={() => setShowApiKeyRoles(!showApiKeyRoles)}
                checked={showApiKeyRoles}
              >{t`API key roles`}</SettingsRow>
            </Dropdown.Section>
          </DropdownContent>
        </DropdownRoot>
      </StyledSearchAndFilterContainer>

      <Table>
        <SettingsRolesTableHeader />
        <StyledTableRows>
          {filteredRoles.length === 0 ? (
            <TableCell color={themeCssVariables.font.color.tertiary}>
              {t`No roles found`}
            </TableCell>
          ) : (
            filteredRoles.map((role) => (
              <SettingsRolesTableRow key={role.id} role={role} />
            ))
          )}
        </StyledTableRows>
      </Table>
      <TableFooter>
        <Button
          startIcon={<IconPlus />}
          size="sm"
          onClick={() => navigateSettings(SettingsPath.RoleCreate)}
          variant="outline"
        >{t`Create Role`}</Button>
      </TableFooter>
    </Section.Root>
  );
};
