import { type ShortcutDefinition } from 'crm-ui/primitives/typography';

export type NavigationDrawerItemModifier =
  | 'soon'
  | 'new'
  | { keyboard: ShortcutDefinition };
