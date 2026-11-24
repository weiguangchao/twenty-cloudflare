import { IconWorld } from 'crm-ui/icon';
import { Avatar } from 'crm-ui/primitives/data-display';
import { OverflowingTextWithTooltip } from 'crm-ui/primitives/typography';
import { themeCssVariables, useTheme } from 'crm-ui/theme';

import { TableCell } from '@/ui/layout/table/components/TableCell';

type SettingsSecurityOriginTableCellProps = {
  origin: string;
};

export const SettingsSecurityOriginTableCell = ({
  origin,
}: SettingsSecurityOriginTableCellProps) => {
  const theme = useTheme();

  return (
    <TableCell
      color={themeCssVariables.font.color.primary}
      gap={themeCssVariables.spacing[2]}
      minWidth="0"
      overflow="hidden"
    >
      <Avatar.Root
        size="md"
        shape="square"
        backgroundColor="transparent"
        aria-hidden
      >
        <Avatar.Fallback render={<IconWorld size={theme.icon.size.md} />} />
      </Avatar.Root>
      <OverflowingTextWithTooltip text={origin} />
    </TableCell>
  );
};
