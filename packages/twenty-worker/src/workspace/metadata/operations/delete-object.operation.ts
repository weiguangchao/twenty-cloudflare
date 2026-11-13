import { isMorphRelationHead } from 'twenty-shared/utils';

import { dropRecordTable } from '@/workspace/metadata/ddl/record-table-ddl.util';
import { MetadataValidationException } from '@/workspace/metadata/errors/metadata-validation.exception';
import { removeFields } from '@/workspace/metadata/operations/utils/field-schema.util';
import {
  findObjectFields,
  findObjectOrThrow,
  isStandardMetadataRow,
} from '@/workspace/metadata/operations/utils/metadata-lookups.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { type ObjectMetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { metadataValidationError } from '@/workspace/metadata/validation/metadata-validation-error.util';

// Relation fields on other objects that point here, plus morph heads left
// without any target once those go.
const collectIncomingFields = (
  context: MetadataOperationContext,
  object: ObjectMetadataRow,
): FieldMetadataRow[] => {
  const incomingFields = (
    context.store.findMany('fieldMetadata', {
      relationTargetObjectMetadataId: object.id,
    }) as FieldMetadataRow[]
  ).filter((field) => field.objectMetadataId !== object.id);
  const incomingFieldIds = new Set(incomingFields.map((field) => field.id));
  const orphanedMorphHeads = incomingFields
    .filter((field) => field.morphId !== null)
    .flatMap((field) => {
      const morphGroup = findObjectFields(
        context.store,
        field.objectMetadataId,
      ).filter((candidate) => candidate.morphId === field.morphId);
      const hasRemainingTarget = morphGroup.some(
        (candidate) =>
          !isMorphRelationHead(candidate) &&
          !incomingFieldIds.has(candidate.id),
      );

      return hasRemainingTarget ? [] : morphGroup.filter(isMorphRelationHead);
    });

  return [
    ...incomingFields,
    ...new Map(orphanedMorphHeads.map((head) => [head.id, head])).values(),
  ];
};

export const deleteObject = (
  context: MetadataOperationContext,
  { id }: { id: string },
): ObjectMetadataRow => {
  const failureContext = {
    metadataName: 'objectMetadata',
    type: 'delete',
  } as const;
  const object = findObjectOrThrow(context.store, id, failureContext);
  const fail = (message: string): never => {
    throw MetadataValidationException.single({
      ...failureContext,
      errors: [
        metadataValidationError(
          'INVALID_OBJECT_INPUT',
          message,
          object.nameSingular,
        ),
      ],
      flatEntityMinimalInformation: {
        id: object.id,
        nameSingular: object.nameSingular,
      },
    });
  };

  if (object.isSystem) fail('System objects cannot be deleted');
  if (isStandardMetadataRow(object)) fail('Standard objects cannot be deleted');

  removeFields(
    context,
    [
      ...collectIncomingFields(context, object),
      ...findObjectFields(context.store, object.id),
    ],
    { droppedObjectIds: [object.id] },
  );
  dropRecordTable(context.sql, object.nameSingular);
  context.store.delete('objectMetadata', [object.id]);

  return object;
};
