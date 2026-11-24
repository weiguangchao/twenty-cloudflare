import { WidgetActionActivityCreate } from '@/page-layout/widgets/components/WidgetActionActivityCreate';
import { StandardObjectNameSingular } from 'crm-shared/types';

export const WidgetActionNoteCreate = () => (
  <WidgetActionActivityCreate
    activityObjectNameSingular={StandardObjectNameSingular.Note}
  />
);
