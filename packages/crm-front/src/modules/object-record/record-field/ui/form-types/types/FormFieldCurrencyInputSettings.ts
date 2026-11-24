import { type FieldMetadataType } from 'crm-shared/types';

export type FormFieldCurrencyInputSettings = {
  type: FieldMetadataType.CURRENCY;
  amountUnit: 'micros' | 'units';
};
