import { type FieldMetadataType } from 'crm-shared/types';
import {
  isFieldMetadataDateKind,
  isFieldMetadataSelectKind,
} from 'crm-shared/utils';
import { type IconComponent } from 'crm-ui/icon';
import { GraphOrderBy } from '~/generated-metadata/graphql';

type SortOption = {
  value: GraphOrderBy;
  icon?: IconComponent | null;
};

type FilterSortOptionsParams = {
  options: SortOption[];
  fieldType: FieldMetadataType;
};

export const filterSortOptionsByFieldType = ({
  options,
  fieldType,
}: FilterSortOptionsParams): SortOption[] => {
  return options.filter((option) => {
    const isValueSort =
      option.value === GraphOrderBy.VALUE_ASC ||
      option.value === GraphOrderBy.VALUE_DESC;

    const isManualSort = option.value === GraphOrderBy.MANUAL;

    const isPositionSort =
      option.value === GraphOrderBy.FIELD_POSITION_ASC ||
      option.value === GraphOrderBy.FIELD_POSITION_DESC;

    const isSelectField = isFieldMetadataSelectKind(fieldType);

    if (isManualSort && !isSelectField) {
      return false;
    }

    if (isPositionSort && !isSelectField) {
      return false;
    }

    if (isFieldMetadataDateKind(fieldType)) {
      return !isValueSort;
    }

    return true;
  });
};
