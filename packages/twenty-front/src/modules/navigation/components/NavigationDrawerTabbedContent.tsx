import { type ReactNode } from 'react';
type NavigationDrawerTabbedContentProps = {
  showAiChatContent: boolean;
  shouldMountAiChatContent: boolean;
  navigationContent: ReactNode;
};
export const NavigationDrawerTabbedContent = ({
  navigationContent,
}: NavigationDrawerTabbedContentProps) => <>{navigationContent}</>;
