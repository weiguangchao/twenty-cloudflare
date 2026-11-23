import { styled } from '@linaria/react';
import { ListItemButton } from 'crm-ui/components/navigation';
import { IconPlus } from 'crm-ui/icon';
import { OverflowingTextWithTooltip } from 'crm-ui/primitives/typography';
import { themeCssVariables } from 'crm-ui/theme';

const StyledAddItemContainer = styled.div`
  padding: ${themeCssVariables.spacing[1]};
`;

type MultiItemFieldAddButtonProps = {
  label: string;
  onClick: () => void;
};

export const MultiItemFieldAddButton = ({
  label,
  onClick,
}: MultiItemFieldAddButtonProps) => (
  <StyledAddItemContainer>
    <ListItemButton onClick={onClick} startIcon={<IconPlus />}>
      <OverflowingTextWithTooltip text={label} />
    </ListItemButton>
  </StyledAddItemContainer>
);
