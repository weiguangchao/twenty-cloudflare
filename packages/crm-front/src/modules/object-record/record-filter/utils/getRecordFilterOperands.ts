import {
  type FilterableAndTSVectorFieldType,
  type RecordFilterOperand,
} from 'crm-shared/types';
import { getFilterOperandsForFilterableFieldType } from 'crm-shared/utils';

export const getRecordFilterOperands = ({
  filterType,
  subFieldName,
}: {
  filterType: FilterableAndTSVectorFieldType;
  subFieldName?: string | null | undefined;
}): readonly RecordFilterOperand[] => {
  return getFilterOperandsForFilterableFieldType({
    filterType,
    subFieldName,
  });
};
