import { type FieldDateMetadataSettings } from '@/object-record/record-field/ui/types/FieldMetadata';
import { EllipsisDisplay } from '@/ui/field/display/components/internal/EllipsisDisplay/EllipsisDisplay';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { UserContext } from '@/users/contexts/UserContext';
import { useContext } from 'react';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import { formatDateString } from '@/object-record/record-field/ui/utils/formatDateString';
import { doNotTranslate } from 'crm-shared/i18n';

type DateDisplayProps = {
  value: string | null | undefined;
  dateFieldSettings?: FieldDateMetadataSettings;
};
export const DateDisplay = ({ value, dateFieldSettings }: DateDisplayProps) => {
  const { dateFormat } = useContext(UserContext);
  const dateLocale = useAtomStateValue(dateLocaleState);

  const formattedDate = formatDateString({
    value,
    timeZone: doNotTranslate('UTC'), // Stored dates (yyyy-mm-dd) are read as UTC midnight
    dateFormat,
    dateFieldSettings,
    localeCatalog: dateLocale.localeCatalog,
  });

  return <EllipsisDisplay>{formattedDate}</EllipsisDisplay>;
};
