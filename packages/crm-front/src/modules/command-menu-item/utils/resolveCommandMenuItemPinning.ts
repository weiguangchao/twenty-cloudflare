import { type CommandMenuContextApi } from 'crm-shared/types';
import { evaluateConditionalAvailabilityExpression } from 'crm-shared/utils';

import { type CommandMenuItemFieldsFragment } from '~/generated-metadata/graphql';

type PinnableCommandMenuItem = Pick<
  CommandMenuItemFieldsFragment,
  'isPinned' | 'conditionalPinnedExpression'
>;

// Resolved once where availability is evaluated, so every consumer keeps
// reading isPinned as a plain boolean.
export const resolveCommandMenuItemPinning = <
  TCommandMenuItem extends PinnableCommandMenuItem,
>(
  commandMenuItem: TCommandMenuItem,
  commandMenuContextApi: CommandMenuContextApi,
): TCommandMenuItem => ({
  ...commandMenuItem,
  isPinned:
    commandMenuItem.isPinned &&
    evaluateConditionalAvailabilityExpression(
      commandMenuItem.conditionalPinnedExpression,
      commandMenuContextApi,
    ),
});
