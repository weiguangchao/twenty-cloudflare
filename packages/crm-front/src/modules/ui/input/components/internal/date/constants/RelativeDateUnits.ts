import { type RelativeDateFilterUnit } from 'crm-shared/utils';
import { doNotTranslate } from 'crm-shared/i18n';

export const RELATIVE_DATE_UNITS: RelativeDateFilterUnit[] = [
  doNotTranslate('DAY'),
  'WEEK',
  'MONTH',
  'QUARTER',
  'YEAR',
];
