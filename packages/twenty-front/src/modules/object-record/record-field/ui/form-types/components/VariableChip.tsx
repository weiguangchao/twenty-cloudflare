import { BaseChip } from '@/ui/input/components/BaseChip';
import { useLingui } from '@lingui/react/macro';

type VariableChipProps = {
  rawVariableName: string;
  onRemove?: () => void;
  isFullRecord?: boolean;
};

export const VariableChip = ({
  rawVariableName,
  onRemove,
}: VariableChipProps) => {
  const { t } = useLingui();

  return (
    <BaseChip
      label={rawVariableName}
      title={rawVariableName}
      onRemove={onRemove}
      removeAriaLabel={t`Remove variable`}
    />
  );
};
