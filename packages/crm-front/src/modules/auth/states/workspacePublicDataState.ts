import { type GetPublicWorkspaceDataByDomainQuery } from '~/generated-metadata/graphql';
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const workspacePublicDataState = createAtomState<
  GetPublicWorkspaceDataByDomainQuery['getPublicWorkspaceDataByDomain'] | null
>({
  key: 'workspacePublicDataState',
  defaultValue: null,
});
