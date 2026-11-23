import { ListItemButton } from 'crm-ui/components/navigation';
import { AppMenuItemIcon } from '@/ui/field/display/application/components/AppMenuItemIcon';
import { useApplicationChipData } from '@/ui/field/display/application/hooks/useApplicationChipData';
import { type ReactNode } from 'react';

type AppMenuItemProps = {
  applicationId?: string | null;
  text: string;
  onClick?: () => void;
  focused?: boolean;
  disabled?: boolean;
  RightComponent?: ReactNode;
};

export const AppMenuItem = ({
  applicationId,
  text,
  onClick,
  focused,
  disabled,
  RightComponent,
}: AppMenuItemProps) => {
  const { applicationChipData } = useApplicationChipData({
    applicationId,
  });

  return (
    <ListItemButton
      startIcon={<AppMenuItemIcon applicationId={applicationId} />}
      description={applicationChipData.name}
      onClick={onClick}
      focused={focused}
      disabled={disabled}
      endIcon={RightComponent}
    >
      {text}
    </ListItemButton>
  );
};
