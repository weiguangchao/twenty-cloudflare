import { type AvatarShape } from 'crm-ui/primitives/data-display';
export type ObjectRecordIdentifier = {
  id: string;
  name: string;
  avatarUrl?: string;
  avatarShape?: AvatarShape | null;
  linkToShowPage?: string;
};
