import { DialogInstance } from '@/ui/layout/dialog/components/DialogInstance';
import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';
import { type OnboardingAction } from '@/onboarding/types/OnboardingAction';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useRef } from 'react';
import { isDefined } from 'crm-shared/utils';
import { IconButton, MainButton } from 'crm-ui/components/input';
import { IconX } from 'crm-ui/icon';
import { Button } from 'crm-ui/primitives/input';
import { Dialog, type DialogPopupProps } from 'crm-ui/primitives/surfaces';
import { themeCssVariables, useTheme } from 'crm-ui/theme';

const StyledHeader = styled(Dialog.Header)`
  align-items: center;
  position: relative;
`;

const StyledCloseButton = styled.div`
  position: absolute;
  right: ${themeCssVariables.spacing[3]};
  top: ${themeCssVariables.spacing[3]};
`;

const StyledVisual = styled.div`
  margin-bottom: ${themeCssVariables.spacing[2]};
`;

type OnboardingSkipDialogProps = {
  dialogId: string;
  visual: ReactNode;
  title: string;
  description?: string;
  actions: OnboardingAction[];
  finalFocus?: DialogPopupProps['finalFocus'];
  onSkip: () => void;
};

export const OnboardingSkipDialog = ({
  dialogId,
  visual,
  title,
  description,
  actions,
  finalFocus,
  onSkip,
}: OnboardingSkipDialogProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const { closeDialog } = useDialog();
  const firstActionRef = useRef<HTMLButtonElement>(null);

  const runAction = (action: OnboardingAction) => {
    closeDialog(dialogId);
    action.onClick();
  };

  return (
    <DialogInstance dialogId={dialogId} dismissible renderInDocumentBody>
      {({ onKeyDown }) => (
        <Dialog.Popup
          onKeyDown={onKeyDown}
          size="compact"
          initialFocus={firstActionRef}
          finalFocus={finalFocus}
          data-globally-prevent-click-outside
        >
          <StyledHeader>
            <StyledCloseButton>
              <IconButton
                variant="ghost"
                size="sm"
                aria-label={t`Close`}
                onClick={() => closeDialog(dialogId)}
              >
                <IconX />
              </IconButton>
            </StyledCloseButton>
            <StyledVisual>{visual}</StyledVisual>
            <Dialog.Title>{title}</Dialog.Title>
            {isDefined(description) && (
              <Dialog.Description>{description}</Dialog.Description>
            )}
          </StyledHeader>
          <Dialog.Footer>
            {actions.map((action, index) => (
              <MainButton
                key={action.label}
                ref={index === 0 ? firstActionRef : undefined}
                fullWidth
                startIcon={
                  isDefined(action.Icon) ? (
                    <action.Icon size={theme.icon.size.md} />
                  ) : undefined
                }
                onClick={() => runAction(action)}
              >
                {action.label}
              </MainButton>
            ))}
            <Button
              variant="ghost"
              fullWidth
              data-testid="onboarding-skip-dialog-skip-anyway"
              onClick={() => {
                closeDialog(dialogId);
                onSkip();
              }}
            >
              {t`Skip anyway`}
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      )}
    </DialogInstance>
  );
};
