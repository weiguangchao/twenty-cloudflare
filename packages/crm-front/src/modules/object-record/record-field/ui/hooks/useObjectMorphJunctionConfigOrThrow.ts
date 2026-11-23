import { useObjectMorphJunctionConfig } from '@/object-record/record-field/ui/hooks/useObjectMorphJunctionConfig';
import { isDefined } from 'crm-shared/utils';
import { doNotTranslate } from 'crm-shared/i18n';

export const useObjectMorphJunctionConfigOrThrow = ({
  objectNameSingular,
}: {
  objectNameSingular: string;
}) => {
  const junctionConfig = useObjectMorphJunctionConfig({ objectNameSingular });

  if (!isDefined(junctionConfig)) {
    throw new Error(
      doNotTranslate(
        `Cannot resolve morph junction metadata for ${objectNameSingular}`,
      ),
    );
  }

  return junctionConfig;
};
