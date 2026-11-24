import { type AllMetadataName } from 'crm-shared/metadata';

import { STANDARD_APPLICATION_ID } from '@/workspace/metadata/constants/metadata-application-ids.constant';
import { MetadataValidationException } from '@/workspace/metadata/errors/metadata-validation.exception';
import { type MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type MetadataValidationFailure } from '@/workspace/metadata/types/metadata-operation-result.type';
import { type ObjectMetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { metadataValidationError } from '@/workspace/metadata/validation/metadata-validation-error.util';

type FailureContext = {
  metadataName: AllMetadataName;
  type: MetadataValidationFailure['type'];
};

export const isStandardMetadataRow = (row: { applicationId: string | null }) =>
  row.applicationId === STANDARD_APPLICATION_ID;

export const findObjectOrThrow = (
  store: MetadataStore,
  objectMetadataId: string,
  failureContext: FailureContext,
): ObjectMetadataRow => {
  const object = store.findById('objectMetadata', objectMetadataId);

  if (object === undefined) {
    throw MetadataValidationException.single({
      ...failureContext,
      errors: [
        metadataValidationError(
          'OBJECT_METADATA_NOT_FOUND',
          'Object metadata not found',
          objectMetadataId,
        ),
      ],
    });
  }

  return object;
};

export const findFieldOrThrow = (
  store: MetadataStore,
  fieldMetadataId: string,
  failureContext: FailureContext,
): FieldMetadataRow => {
  const field = store.findById('fieldMetadata', fieldMetadataId) as
    | FieldMetadataRow
    | undefined;

  if (field === undefined) {
    throw MetadataValidationException.single({
      ...failureContext,
      errors: [
        metadataValidationError(
          'FIELD_METADATA_NOT_FOUND',
          'Field metadata not found',
          fieldMetadataId,
        ),
      ],
    });
  }

  return field;
};

export const findObjectFields = (
  store: MetadataStore,
  objectMetadataId: string,
): FieldMetadataRow[] =>
  store.findMany('fieldMetadata', { objectMetadataId }) as FieldMetadataRow[];

export const resolveObjectNameSingular =
  (store: MetadataStore) => (objectMetadataId: string) => {
    const object = store.findById('objectMetadata', objectMetadataId);

    if (object === undefined) {
      throw new Error(`Object ${objectMetadataId} not found`);
    }

    return object.nameSingular;
  };
