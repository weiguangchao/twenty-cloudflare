import { type MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { isVisibleMetadataField } from '@/metadata-api/utils/is-visible-metadata-field.util';
import { type PermissionContext } from '@/workspace/permissions/types/permission-context.type';
import { type MetadataChange } from '@/workspace/subscriptions/event-stream.type';

export const readableMetadataEvent = (
  store: MetadataStore,
  permissions: PermissionContext,
  event: MetadataChange,
): MetadataChange | undefined => {
  const record = event.properties.after ?? event.properties.before;
  if (!record) return undefined;
  if (event.metadataName === 'navigationMenuItem') {
    const visible = (row: Record<string, unknown> | undefined) =>
      row &&
      (!row.userWorkspaceId ||
        row.userWorkspaceId === permissions.userWorkspaceId);
    const beforeVisible = visible(event.properties.before),
      afterVisible = visible(event.properties.after);
    if (!beforeVisible && !afterVisible) return undefined;
    if (!beforeVisible && event.properties.before)
      event = {
        ...event,
        type: 'CREATED',
        properties: { after: event.properties.after },
      };
    if (!afterVisible && event.properties.after)
      event = {
        ...event,
        type: 'DELETED',
        properties: { before: event.properties.before },
      };
  }
  if (
    [
      'role',
      'objectPermission',
      'fieldPermission',
      'rolePermissionFlag',
    ].includes(event.metadataName) &&
    !permissions.permissionFlags.includes('ROLES')
  )
    return undefined;
  if (
    event.metadataName === 'roleTarget' &&
    record.userWorkspaceId !== permissions.userWorkspaceId &&
    !permissions.permissionFlags.includes('ROLES')
  )
    return undefined;
  if (
    event.metadataName === 'fieldMetadata' &&
    !isVisibleMetadataField(record as FieldMetadataRow)
  )
    return undefined;
  const relation = (field: FieldMetadataRow) => {
    let targetField = store.findById(
      'fieldMetadata',
      field.relationTargetFieldMetadataId ?? '',
    );
    if (field.type === 'RELATION' && targetField?.type === 'MORPH_RELATION')
      targetField = store.findMany('fieldMetadata', {
        universalIdentifier: targetField.morphId ?? '',
      })[0];
    const sourceObject = store.findById(
      'objectMetadata',
      field.objectMetadataId,
    );
    const targetObject = store.findById(
      'objectMetadata',
      field.relationTargetObjectMetadataId ?? '',
    );
    if (
      !targetField ||
      !sourceObject ||
      !targetObject ||
      !field.settings?.relationType
    )
      return null;
    return {
      type: field.settings.relationType,
      sourceObjectMetadata: {
        id: sourceObject.id,
        nameSingular: sourceObject.nameSingular,
        namePlural: sourceObject.namePlural,
      },
      targetObjectMetadata: {
        id: targetObject.id,
        nameSingular: targetObject.nameSingular,
        namePlural: targetObject.namePlural,
      },
      sourceFieldMetadata: { id: field.id, name: field.name },
      targetFieldMetadata: { id: targetField.id, name: targetField.name },
    };
  };
  const enrich = (record: Record<string, unknown> | undefined) => {
    if (!record) return undefined;
    if (event.metadataName === 'fieldMetadata') {
      const field = record as FieldMetadataRow;
      return {
        ...record,
        isUnique: store
          .findMany('indexMetadata', {
            objectMetadataId: field.objectMetadataId,
          })
          .some((index) => {
            const fields = store.findMany('indexFieldMetadata', {
              indexMetadataId: index.id,
            });
            return (
              index.isUnique &&
              fields.length === 1 &&
              fields[0].fieldMetadataId === field.id
            );
          }),
        isSearchable:
          store.findMany('searchFieldMetadata', { fieldMetadataId: field.id })
            .length > 0,
        relation: field.type === 'RELATION' ? relation(field) : null,
        morphRelations:
          field.type === 'MORPH_RELATION'
            ? store
                .findMany('fieldMetadata', {
                  objectMetadataId: field.objectMetadataId,
                  morphId: field.morphId,
                })
                .map((field) => relation(field as FieldMetadataRow))
                .filter((value) => value !== null)
            : null,
      };
    }
    if (event.metadataName === 'index')
      return {
        ...record,
        indexFieldMetadatas: store.findMany('indexFieldMetadata', {
          indexMetadataId: String(record.id),
        }),
        isCustom: record.isSystemSideEffect === false,
      };
    if (event.metadataName === 'objectMetadata')
      return {
        ...record,
        color: record.color ?? '',
        searchFieldMetadatas: store.findMany('searchFieldMetadata', {
          objectMetadataId: String(record.id),
        }),
      };
    if (event.metadataName === 'view')
      return { ...record, isCustom: record.isSystemSideEffect === false };
    return record;
  };
  return {
    ...event,
    properties: {
      ...event.properties,
      before: enrich(event.properties.before),
      after: enrich(event.properties.after),
    },
  };
};
