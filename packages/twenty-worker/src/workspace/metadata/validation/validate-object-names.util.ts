import {
  type FailedMetadataValidationError,
  computeMetadataNameFromLabel,
} from 'twenty-shared/metadata';

import { type MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { metadataValidationError } from '@/workspace/metadata/validation/metadata-validation-error.util';
import { validateMetadataName } from '@/workspace/metadata/validation/validate-metadata-name.util';

type ObjectNamesAndLabels = {
  nameSingular: string;
  namePlural: string;
  labelSingular: string;
  labelPlural: string;
  isLabelSyncedWithName: boolean;
};

export const validateObjectNames = (
  store: MetadataStore,
  {
    nameSingular,
    namePlural,
    excludedObjectId,
  }: Pick<ObjectNamesAndLabels, 'nameSingular' | 'namePlural'> & {
    excludedObjectId?: string;
  },
): FailedMetadataValidationError[] => {
  const errors = [
    ...validateMetadataName(nameSingular, 'INVALID_OBJECT_INPUT'),
    ...validateMetadataName(namePlural, 'INVALID_OBJECT_INPUT'),
  ];

  if (nameSingular === namePlural) {
    errors.push(
      metadataValidationError(
        'INVALID_OBJECT_INPUT',
        'The singular and plural names cannot be the same for an object',
        nameSingular,
      ),
    );
  }

  const takenNames = new Set(
    store
      .findMany('objectMetadata')
      .filter((object) => object.id !== excludedObjectId)
      .flatMap((object) => [object.nameSingular, object.namePlural]),
  );

  for (const name of [nameSingular, namePlural]) {
    if (takenNames.has(name)) {
      errors.push(
        metadataValidationError(
          'NOT_AVAILABLE',
          `Name "${name}" is not available`,
          name,
        ),
      );
    }
  }

  return errors;
};

export const validateObjectLabels = ({
  nameSingular,
  namePlural,
  labelSingular,
  labelPlural,
  isLabelSyncedWithName,
}: ObjectNamesAndLabels): FailedMetadataValidationError[] => {
  const errors: FailedMetadataValidationError[] = [];

  for (const label of [labelSingular, labelPlural]) {
    if (label.trim() === '') {
      errors.push(
        metadataValidationError(
          'INVALID_OBJECT_INPUT',
          'Label is required',
          label,
        ),
      );
    }
  }
  if (
    isLabelSyncedWithName &&
    (computeMetadataNameFromLabel({ label: labelSingular }) !== nameSingular ||
      computeMetadataNameFromLabel({ label: labelPlural }) !== namePlural)
  ) {
    errors.push(
      metadataValidationError(
        'INVALID_OBJECT_INPUT',
        'Names are not synced with labels',
        nameSingular,
      ),
    );
  }

  return errors;
};
