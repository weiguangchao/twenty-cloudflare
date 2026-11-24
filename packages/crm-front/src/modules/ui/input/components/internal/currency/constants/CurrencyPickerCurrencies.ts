import { type CurrencyPickerOption } from 'crm-ui/components/input';
import { CURRENCY_CODE_LABELS } from 'crm-shared/constants';

export const CURRENCY_PICKER_CURRENCIES: readonly CurrencyPickerOption[] =
  Object.entries(CURRENCY_CODE_LABELS).map(([code, { label }]) => ({
    code,
    name: label,
  }));
