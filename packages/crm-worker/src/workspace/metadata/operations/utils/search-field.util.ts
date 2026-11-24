import { FieldMetadataType } from 'crm-shared/types';

import { CUSTOM_APPLICATION_ID } from '@/workspace/metadata/constants/metadata-application-ids.constant';
import { findObjectFields } from '@/workspace/metadata/operations/utils/metadata-lookups.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';

export const addSearchField = (
  { store }: MetadataOperationContext,
  field: FieldMetadataRow,
) => {
  const searchFields = store.findMany('searchFieldMetadata', {
    objectMetadataId: field.objectMetadataId,
  });

  if (
    searchFields.some((searchField) => searchField.fieldMetadataId === field.id)
  ) {
    return;
  }

  const tsVectorField = findObjectFields(store, field.objectMetadataId).find(
    (candidate) => candidate.type === FieldMetadataType.TS_VECTOR,
  );
  const now = new Date().toISOString();

  if (tsVectorField === undefined) {
    throw new Error(
      `Object ${field.objectMetadataId} has no search vector field`,
    );
  }

  store.insert('searchFieldMetadata', {
    id: crypto.randomUUID(),
    objectMetadataId: field.objectMetadataId,
    fieldMetadataId: field.id,
    createdAt: now,
    updatedAt: now,
    universalIdentifier: crypto.randomUUID(),
    applicationId: CUSTOM_APPLICATION_ID,
    position:
      searchFields.reduce(
        (highest, searchField) => Math.max(highest, searchField.position),
        -1,
      ) + 1,
    tsVectorFieldMetadataId: tsVectorField.id,
    isSystemSideEffect: false,
  });
};

export const removeSearchField = (
  { store }: MetadataOperationContext,
  field: FieldMetadataRow,
) => {
  store.delete(
    'searchFieldMetadata',
    store
      .findMany('searchFieldMetadata', { fieldMetadataId: field.id })
      .map((searchField) => searchField.id),
  );
};
