import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { isDefined } from 'crm-shared/utils';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { type AvailableWorkspaceFragmentFragment } from '~/generated-metadata/graphql';

export const useFilteredAvailableWorkspaces = () => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  const searchAvailableWorkspaces = (
    searchValue: string,
    availableWorkspaces: Array<AvailableWorkspaceFragmentFragment>,
  ) => {
    return availableWorkspaces.filter(
      (availableWorkspace) =>
        isDefined(currentWorkspace?.id) &&
        availableWorkspace.id !== currentWorkspace.id &&
        availableWorkspace.displayName
          ?.toLowerCase()
          .includes(searchValue.toLowerCase()) === true,
    );
  };

  return {
    searchAvailableWorkspaces,
  };
};
