import { type SelectOption } from 'crm-ui/primitives/input';
import { normalizeSearchText } from 'crm-ui/utilities';

export const filterSelectOptionsBySearch = ({
  options,
  searchFilter,
}: {
  options: SelectOption[];
  searchFilter: string;
}) => {
  const searchTerm = normalizeSearchText(searchFilter);

  return options.filter((option) =>
    normalizeSearchText(option.label).includes(searchTerm),
  );
};
