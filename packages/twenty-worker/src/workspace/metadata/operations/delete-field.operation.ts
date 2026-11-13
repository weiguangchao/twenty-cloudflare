import { isMorphRelationHead } from 'twenty-shared/utils';

import { MetadataValidationException } from '@/workspace/metadata/errors/metadata-validation.exception';
import { removeFields } from '@/workspace/metadata/operations/utils/field-schema.util';
import {
  findFieldOrThrow,
  findObjectFields,
  findObjectOrThrow,
  isStandardMetadataRow,
} from '@/workspace/metadata/operations/utils/metadata-lookups.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { metadataValidationError } from '@/workspace/metadata/validation/metadata-validation-error.util';

// A relation is deleted with its inverse; a morph relation with its head,
// every sibling and their inverses.
const collectFieldsToDelete = (
  context: MetadataOperationContext,
  field: FieldMetadataRow,
): FieldMetadataRow[] => {
  const groupFields =
    field.morphId === null
      ? [field]
      : findObjectFields(context.store, field.objectMetadataId).filter(
          (candidate) => candidate.morphId === field.morphId,
        );
  const inverseFields = groupFields
    .map((groupField) => groupField.relationTargetFieldMetadataId)
    .filter((inverseId): inverseId is string => inverseId !== null)
    .map(
      (inverseId) =>
        context.store.findById('fieldMetadata', inverseId) as FieldMetadataRow,
    );

  return [...groupFields, ...inverseFields];
};

export const deleteField = (
  context: MetadataOperationContext,
  { id }: { id: string },
): FieldMetadataRow[] => {
  const failureContext = {
    metadataName: 'fieldMetadata',
    type: 'delete',
  } as const;
  const field = findFieldOrThrow(context.store, id, failureContext);
  const object = findObjectOrThrow(
    context.store,
    field.objectMetadataId,
    failureContext,
  );
  const fail = (message: string): never => {
    throw MetadataValidationException.single({
      ...failureContext,
      errors: [
        metadataValidationError(
          'FIELD_MUTATION_NOT_ALLOWED',
          message,
          field.name,
        ),
      ],
      flatEntityMinimalInformation: { id: field.id, name: field.name },
    });
  };

  if (isStandardMetadataRow(field) || field.isSystem) {
    fail(`Cannot delete standard field "${field.name}"`);
  }
  if (field.isSystemSideEffect && !isMorphRelationHead(field)) {
    fail(`Cannot delete system-managed field "${field.name}"`);
  }
  if (object.labelIdentifierFieldMetadataId === field.id) {
    fail('Cannot delete, please update the label identifier field first');
  }

  const fieldsToDelete = collectFieldsToDelete(context, field);

  removeFields(context, fieldsToDelete);

  return fieldsToDelete;
};
