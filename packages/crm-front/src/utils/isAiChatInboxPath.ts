import { AppPath } from 'crm-shared/types';

import { isMatchingPathname } from '~/utils/isMatchingPathname';

export const isAiChatInboxPath = (pathname: string) =>
  isMatchingPathname(pathname, AppPath.AiChatInbox);
