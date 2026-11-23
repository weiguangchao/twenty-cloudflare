import { AnimatedContainer } from '@/ui/layout/animation/components/internal/AnimatedContainer/AnimatedContainer';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'crm-shared/utils';
import { LightIconButton } from 'crm-ui/components/input';
import { type IconComponent } from 'crm-ui/icon';
import { ButtonGroup } from 'crm-ui/primitives/input';
import { MOBILE_VIEWPORT, themeCssVariables } from 'crm-ui/theme';

const StyledButtonContainer = styled.div`
  margin: ${themeCssVariables.spacing['0.5']};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    position: relative;
    right: 7px;
  }
`;

type RecordTableCellButtonsProps = {
  onClick?: () => void;
  Icon: IconComponent;
  ariaLabel: string;
}[];

export const RecordTableCellButtons = ({
  buttons,
}: {
  buttons: RecordTableCellButtonsProps;
}) => {
  const { t } = useLingui();

  return (
    <AnimatedContainer>
      <StyledButtonContainer>
        <ButtonGroup aria-label={t`Cell controls`} framed attached={false}>
          {buttons.map(({ Icon, onClick, ariaLabel }, index) => (
            <LightIconButton
              key={index}
              size="xs"
              aria-label={ariaLabel}
              onClick={onClick}
              disabled={!isDefined(onClick)}
            >
              <Icon />
            </LightIconButton>
          ))}
        </ButtonGroup>
      </StyledButtonContainer>
    </AnimatedContainer>
  );
};
