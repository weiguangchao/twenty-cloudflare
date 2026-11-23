import { isNonEmptyString } from '@sniptt/guards';
import { isDefined, isNonEmptyArray } from 'crm-shared/utils';
import { Dropdown } from 'crm-ui/components/navigation';
import { IconPlus } from 'crm-ui/icon';
import { type SelectOption } from 'crm-ui/primitives/input';
import { useLingui } from '@lingui/react/macro';

type AddSelectOptionDropdownSectionProps = {
  searchFilter: string;
  filteredOptions: SelectOption[];
  onAddSelectOption?: (optionName: string) => void;
};

export const AddSelectOptionDropdownSection = ({
  searchFilter,
  filteredOptions,
  onAddSelectOption,
}: AddSelectOptionDropdownSectionProps) => {
  const { t } = useLingui();
  const optionName = searchFilter.trim();

  if (
    !isDefined(onAddSelectOption) ||
    !isNonEmptyString(optionName) ||
    isNonEmptyArray(filteredOptions)
  ) {
    return null;
  }

  return (
    <>
      <Dropdown.Separator />
      <Dropdown.Section>
        <Dropdown.ActionItem
          onClick={() => onAddSelectOption(optionName)}
          closeOnClick={false}
          startIcon={<IconPlus />}
        >
          {t`Add "${optionName}" to options`}
        </Dropdown.ActionItem>
      </Dropdown.Section>
    </>
  );
};
