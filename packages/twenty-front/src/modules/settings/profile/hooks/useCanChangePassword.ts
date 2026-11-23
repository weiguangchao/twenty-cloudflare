import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useCanChangePassword = () => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  return {
    canChangePassword: currentWorkspace?.isPasswordAuthEnabled === true,
  };
};
