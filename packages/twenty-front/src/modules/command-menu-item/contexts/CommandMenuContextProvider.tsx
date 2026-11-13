import { type CommandMenuContextType } from '@/command-menu-item/contexts/CommandMenuContext';
import { useCurrentCommandMenuContextApi } from '@/command-menu-item/hooks/useCurrentCommandMenuContextApi';
import { CommandMenuContextProviderContent } from './CommandMenuContextProviderContent';

type CommandMenuContextProviderProps = {
  displayType: CommandMenuContextType['displayType'];
  containerType: CommandMenuContextType['containerType'];
  children: React.ReactNode;
  isInPreviewMode?: boolean;
};

export const CommandMenuContextProvider = ({
  displayType,
  containerType,
  children,
  isInPreviewMode = false,
}: CommandMenuContextProviderProps) => {
  const commandMenuContextApi = useCurrentCommandMenuContextApi();

  return (
    <CommandMenuContextProviderContent
      displayType={displayType}
      containerType={containerType}
      commandMenuContextApi={commandMenuContextApi}
      isInPreviewMode={isInPreviewMode}
    >
      {children}
    </CommandMenuContextProviderContent>
  );
};
