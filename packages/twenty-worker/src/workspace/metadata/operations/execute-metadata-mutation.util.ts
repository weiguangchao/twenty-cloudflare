import { isPlainObject } from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { getWorkspaceMember } from '@/workspace/lifecycle/workspace-members.util';
import { createObject } from '@/workspace/metadata/operations/create-object.operation';
import { updateObject } from '@/workspace/metadata/operations/update-object.operation';
import { deleteObject } from '@/workspace/metadata/operations/delete-object.operation';
import { createField } from '@/workspace/metadata/operations/create-field.operation';
import { updateField } from '@/workspace/metadata/operations/update-field.operation';
import { deleteField } from '@/workspace/metadata/operations/delete-field.operation';
import {
  createIndex,
  deleteIndex,
} from '@/workspace/metadata/operations/index-operations';
import {
  UiMetadataService,
  type UiMetadataEntity,
} from '@/workspace/metadata/operations/ui-metadata.service';
import {
  createObjectUi,
  synchronizeObjectUi,
} from '@/workspace/metadata/operations/utils/synchronize-object-ui.util';
import {
  type CreateObjectInput,
  type UpdateObjectInput,
} from '@/workspace/metadata/types/object-metadata-inputs.type';
import {
  type CreateFieldInput,
  type UpdateFieldInput,
} from '@/workspace/metadata/types/field-metadata-inputs.type';
import { type JsonValue } from '@/workspace/metadata/types/json-value.type';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { buildPermissionContext } from '@/workspace/permissions/build-permission-context.util';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';

const ENTITIES: Record<string, UiMetadataEntity> = {
  View: 'view',
  ViewField: 'viewField',
  ViewFieldGroup: 'viewFieldGroup',
  ViewFilter: 'viewFilter',
  ViewFilterGroup: 'viewFilterGroup',
  ViewSort: 'viewSort',
  ViewGroup: 'viewGroup',
  NavigationMenuItem: 'navigationMenuItem',
};
export const METADATA_WRITE_OPERATIONS = [
  'createOneObject',
  'updateOneObject',
  'updateManyObjects',
  'deleteOneObject',
  'createOneField',
  'updateOneField',
  'deleteOneField',
  'createOneIndex',
  'deleteOneIndex',
  ...Object.keys(ENTITIES).flatMap((entity) =>
    ['create', 'update', 'delete', 'destroy'].map(
      (action) => `${action}${entity}`,
    ),
  ),
  'createManyViewFields',
  'createManyViewFieldGroups',
  'createManyViewGroups',
  'updateManyViewGroups',
  'createManyNavigationMenuItems',
  'updateManyNavigationMenuItems',
  'deleteManyNavigationMenuItems',
];

export const metadataWritePermissions = (
  context: MetadataOperationContext,
  identity: RecordQueryIdentity,
) => {
  const member = getWorkspaceMember(context.sql, identity);
  const permissions = buildPermissionContext(
    context.store,
    identity.userWorkspaceId,
  );
  if (
    !member ||
    member.userId !== identity.userId ||
    !permissions.roleIds.length
  )
    throw apiError('Workspace access denied', 'FORBIDDEN');
  return permissions;
};
const objectInput = (input: unknown): Record<string, unknown> => {
  if (!isPlainObject(input)) throw apiError('Invalid metadata input');
  return input;
};
const batchInput = (input: unknown) => {
  if (!Array.isArray(input) || input.length > 200)
    throw apiError('Invalid metadata batch');
  return input;
};
const normalizeDefault = (value: JsonValue): JsonValue => {
  if (typeof value === 'string' && value.startsWith("'") && value.endsWith("'"))
    return value.slice(1, -1).replaceAll("''", "'");
  if (Array.isArray(value)) return value.map(normalizeDefault);
  if (isPlainObject(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        normalizeDefault(item as JsonValue),
      ]),
    );
  return value;
};
const fieldInput = (input: unknown) => {
  const field = objectInput(input);
  return {
    ...field,
    ...('defaultValue' in field
      ? { defaultValue: normalizeDefault(field.defaultValue as JsonValue) }
      : {}),
  };
};

const refreshObjectUi = (
  context: MetadataOperationContext,
  objectId: string,
) => {
  const object = context.store.findById('objectMetadata', objectId);
  if (object) synchronizeObjectUi(context, object);
};

export const executeMetadataMutation = (
  context: MetadataOperationContext,
  name: string,
  arguments_: Record<string, unknown>,
  identity: RecordQueryIdentity,
): unknown => {
  if (!METADATA_WRITE_OPERATIONS.includes(name))
    throw apiError('Unknown metadata operation');
  const permissions = metadataWritePermissions(context, identity);
  const service = new UiMetadataService(
    context,
    permissions,
    name.startsWith('update')
      ? 'update'
      : name.startsWith('delete') || name.startsWith('destroy')
        ? 'delete'
        : 'create',
  );
  const input =
    arguments_.input === undefined ? {} : objectInput(arguments_.input);
  if (
    [
      'createOneObject',
      'updateOneObject',
      'updateManyObjects',
      'deleteOneObject',
      'createOneField',
      'updateOneField',
      'deleteOneField',
      'createOneIndex',
      'deleteOneIndex',
    ].includes(name)
  ) {
    service.requireFlag('DATA_MODEL');
    switch (name) {
      case 'createOneObject': {
        const object = createObject(
          context,
          objectInput(input.object) as CreateObjectInput,
        );
        createObjectUi(context, object);
        return object;
      }
      case 'updateOneObject':
        return updateObject(context, {
          id: String(input.id),
          update: objectInput(input.update) as UpdateObjectInput,
        });
      case 'updateManyObjects':
        return batchInput(arguments_.inputs).map((value) => {
          const entry = objectInput(value);
          return updateObject(context, {
            id: String(entry.id),
            update: objectInput(entry.update) as UpdateObjectInput,
          });
        });
      case 'deleteOneObject':
        return deleteObject(context, { id: String(input.id) });
      case 'createOneField': {
        const fields = createField(
          context,
          fieldInput(input.field) as CreateFieldInput,
        );
        for (const objectId of new Set(
          fields.map((field) => field.objectMetadataId),
        ))
          refreshObjectUi(context, objectId);
        return fields[0];
      }
      case 'updateOneField': {
        const field = updateField(context, {
          id: String(input.id),
          update: fieldInput(input.update) as UpdateFieldInput,
        });
        refreshObjectUi(context, field.objectMetadataId);
        return field;
      }
      case 'deleteOneField': {
        const fields = deleteField(context, { id: String(input.id) });
        for (const objectId of new Set(
          fields.map((field) => field.objectMetadataId),
        ))
          refreshObjectUi(context, objectId);
        return fields[0];
      }
      case 'createOneIndex':
        return createIndex(
          context,
          objectInput(input.index) as Parameters<typeof createIndex>[1],
        );
      case 'deleteOneIndex':
        return deleteIndex(context, { id: String(input.id) });
    }
  }
  const match = /^(create|update|delete|destroy)(Many)?(.+?)(?:s)?$/.exec(
    name,
  )!;
  const [, action, many, entityName] = match;
  const entity = ENTITIES[entityName];
  if (!entity) throw apiError('Unsupported metadata entity');
  const values = many
    ? batchInput(action === 'delete' ? arguments_.ids : arguments_.inputs)
    : [input];
  const rows = values.map((value) => {
    const entry =
      typeof value === 'string' ? { id: value } : objectInput(value);
    const id = String(entry.id ?? arguments_.id);
    if (action === 'create') return service.create(entity, entry);
    if (action === 'update')
      return service.update(entity, id, objectInput(entry.update ?? entry));
    return service.remove(entity, id, action === 'destroy');
  });
  if (many) return rows;
  return ['delete', 'destroy'].includes(action) &&
    ['view', 'viewSort', 'viewFilterGroup'].includes(entity)
    ? true
    : rows[0];
};
