import { capitalize, isMorphRelationHead } from 'crm-shared/utils';

import { type MetadataSnapshot } from '@/workspace/metadata/snapshot/build-metadata-snapshot.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import {
  type RecordCatalog,
  type RecordObject,
} from '@/workspace/record-api/types/record-query.type';
import { apiError } from '@/shared/errors/api-error.util';

export const COMPOSITE_GRAPHQL_TYPES: Record<string, string> = {
  ADDRESS: 'Address',
  CURRENCY: 'Currency',
  FULL_NAME: 'FullName',
  LINKS: 'Links',
  EMAILS: 'Emails',
  PHONES: 'Phones',
  ACTOR: 'Actor',
  RICH_TEXT: 'RichText',
};

export const createRecordCatalog = (
  snapshot: MetadataSnapshot,
): RecordCatalog => {
  const objects = snapshot.objects
    .filter((object) => object.isActive)
    .map((object) => ({
      ...object,
      fields: object.fields.filter(
        (field) => field.isActive && !isMorphRelationHead(field),
      ),
      typeName: capitalize(object.nameSingular),
      fieldsByName: new Map<string, FieldMetadataRow>(),
    }));
  const objectsById = new Map(objects.map((object) => [object.id, object]));
  for (const object of objects) {
    object.fields = object.fields.filter(
      (field) =>
        !field.relationTargetObjectMetadataId ||
        objectsById.has(field.relationTargetObjectMetadataId),
    );
    object.fieldsByName = new Map(
      object.fields.map((field) => [field.name, field]),
    );
  }
  return {
    version: snapshot.version,
    objects,
    objectsById,
    fieldsById: new Map(
      objects.flatMap((object) =>
        object.fields.map((field) => [field.id, field]),
      ),
    ),
  };
};

export const relationTarget = (
  catalog: RecordCatalog,
  field: FieldMetadataRow,
) => {
  const target = catalog.objectsById.get(
    field.relationTargetObjectMetadataId ?? '',
  );
  if (!target) throw apiError('Unknown relation target');
  return target;
};

export const recordField = (object: RecordObject, name: string) => {
  const field =
    object.fieldsByName.get(name) ??
    object.fields.find(
      (candidate) =>
        candidate.settings?.relationType === 'MANY_TO_ONE' &&
        (candidate.settings.joinColumnName ?? `${candidate.name}Id`) === name,
    );
  if (!field) throw apiError(`Unknown field ${object.nameSingular}.${name}`);
  return field;
};
