import { AppChip } from '@/ui/field/display/application/components/AppChip';
import { ApplicationStackIcon } from '@/ui/field/display/application/components/ApplicationStackIcon';
import { styled } from '@linaria/react';
import { isDefined } from 'crm-shared/utils';
import { type IconComponent } from 'crm-ui/icon';
import { themeCssVariables } from 'crm-ui/theme';

const StyledAppIconContainer = styled.span`
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  padding: ${themeCssVariables.spacing[1]};
`;

type AppMenuItemIconProps = {
  applicationId?: string | null;
  Icon?: IconComponent;
};

export const AppMenuItemIcon = ({
  applicationId,
  Icon,
}: AppMenuItemIconProps) => (
  <StyledAppIconContainer>
    {isDefined(Icon) ? (
      <ApplicationStackIcon Icon={Icon} applicationId={applicationId} />
    ) : (
      <AppChip applicationId={applicationId} size="md" chipOnly />
    )}
  </StyledAppIconContainer>
);
