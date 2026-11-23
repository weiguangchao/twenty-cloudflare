import { type AuthProviders } from '~/generated-metadata/graphql';
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const authProvidersState = createAtomState<Omit<AuthProviders, 'sso'>>({
  key: 'authProvidersState',
  defaultValue: {
    google: true,
    magicLink: false,
    password: true,
    microsoft: false,
  },
});
