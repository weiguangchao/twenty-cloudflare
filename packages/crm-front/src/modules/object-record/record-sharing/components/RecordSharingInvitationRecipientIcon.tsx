import { IconLock, IconUsers } from 'crm-ui/icon';
import { Avatar } from 'crm-ui/primitives/data-display';
import { useTheme } from 'crm-ui/theme';

import { type RecordSharingInvitationRecipient } from '@/object-record/record-sharing/types/RecordSharingInvitationRecipient';
import { ListItemIconContainer } from '@/ui/navigation/list-item/components/ListItemIconContainer';

type RecordSharingInvitationRecipientIconProps = {
  recipient: RecordSharingInvitationRecipient;
};

export const RecordSharingInvitationRecipientIcon = ({
  recipient,
}: RecordSharingInvitationRecipientIconProps) => {
  const theme = useTheme();

  if (recipient.kind === 'workspaceMember') {
    return (
      <ListItemIconContainer>
        <Avatar
          name={recipient.label}
          src={recipient.avatarUrl}
          colorSeed={recipient.id}
          size="md"
          shape="circle"
        />
      </ListItemIconContainer>
    );
  }

  const Icon = recipient.kind === 'role' ? IconLock : IconUsers;

  return (
    <ListItemIconContainer>
      <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
    </ListItemIconContainer>
  );
};
