import { TimeFormat } from '@/localization/constants/TimeFormat';
import { doNotTranslate } from 'crm-shared/i18n';

export const getTimeMask = (timeFormat: TimeFormat): string => {
  return doNotTranslate(
    timeFormat === TimeFormat.HOUR_12 ? 'HH`:mm` `aa' : 'HH`:mm`',
  );
};
