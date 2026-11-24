import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Dropdown } from 'crm-ui/components/navigation';
import { type FlatAgent } from '@/metadata-store/types/FlatAgent';
import {
  type ApiKeyForRole,
  GetApiKeysDocument,
} from '~/generated-metadata/graphql';
import { normalizeSearchText } from 'crm-ui/utilities';

type EntityData = FlatAgent | ApiKeyForRole;

type SettingsRoleAssignmentEntityPickerDropdownProps = {
  entityType: 'agent' | 'apiKey';
  excludedIds: string[];
  onSelect: (entity: EntityData) => void;
};

export const SettingsRoleAssignmentEntityPickerDropdown = ({
  excludedIds,
  onSelect,
}: SettingsRoleAssignmentEntityPickerDropdownProps) => {
  const [searchFilter, setSearchFilter] = useState('');
  const { t } = useLingui();

  const { data, loading } = useQuery(GetApiKeysDocument);
  const entities: ApiKeyForRole[] = (data?.apiKeys ?? []).map((entity) => ({
    ...entity,
    __typename: 'ApiKeyForRole',
  }));
  const placeholder = t`Search API keys`;
  const getEmptyStateMessage = () =>
    searchFilter ? t`No API keys match your search` : t`No API keys available`;
  const filteredEntities = useMemo(() => {
    const searchTerm = normalizeSearchText(searchFilter);
    return entities.filter((entity) => {
      const isExcluded = excludedIds.includes(entity.id);

      if (isExcluded) {
        return false;
      }

      return normalizeSearchText(entity.name).includes(searchTerm);
    });
  }, [entities, searchFilter, excludedIds]);

  return (
    <>
      <Dropdown.Search
        value={searchFilter}
        onValueChange={setSearchFilter}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <Dropdown.Separator />
      <Dropdown.Section scrollable>
        {loading && <Dropdown.Loading>{t`Loading...`}</Dropdown.Loading>}
        {!loading && filteredEntities.length === 0 && (
          <Dropdown.Empty>{getEmptyStateMessage()}</Dropdown.Empty>
        )}
        {!loading &&
          filteredEntities.map((entity) => (
            <Dropdown.ActionItem
              key={entity.id}
              onClick={() => onSelect(entity)}
            >
              {entity.name}
            </Dropdown.ActionItem>
          ))}
      </Dropdown.Section>
    </>
  );
};
