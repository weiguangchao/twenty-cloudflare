import { type MessageDescriptor } from '@lingui/core';
import { type ShortcutDefinition } from 'crm-ui/primitives/typography';

export type Shortcut = {
  label: MessageDescriptor;
  shortcuts: readonly ShortcutDefinition[];
};
