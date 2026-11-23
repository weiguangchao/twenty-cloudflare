import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import { type AvailableWorkspacesFragmentFragment } from '~/generated-metadata/graphql';

export const availableWorkspacesState = createAtomState<
  Omit<AvailableWorkspacesFragmentFragment, '__typename'>
>({
  key: 'availableWorkspacesState',
  defaultValue: {
    availableWorkspacesForSignIn: [],
    availableWorkspacesForSignUp: [],
  },
});
