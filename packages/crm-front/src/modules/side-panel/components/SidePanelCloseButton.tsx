import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { useLingui } from '@lingui/react/macro';
import { IconX } from 'crm-ui/icon';
import { IconButton } from 'crm-ui/components/input';

export const SidePanelCloseButton = () => {
  const { t } = useLingui();
  const { closeSidePanelMenu } = useSidePanelMenu();

  const closeSidePanelLabel = t`Close side panel`;

  return (
    <IconButton
      tooltip={closeSidePanelLabel}
      size="sm"
      variant="outline"
      onClick={closeSidePanelMenu}
      aria-label={closeSidePanelLabel}
    >
      <IconX />
    </IconButton>
  );
};
