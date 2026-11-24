import {
  getNamedType,
  isLeafType,
  isObjectType,
  type GraphQLSchema,
} from 'graphql';

import { apiError } from '@/shared/errors/api-error.util';
import { recordField } from '@/workspace/record-api/record-catalog.util';
import {
  type RecordCatalog,
  type RecordObject,
} from '@/workspace/record-api/types/record-query.type';
import { type PermissionContext } from '@/workspace/permissions/types/permission-context.type';

export const restRecordSelection = (
  catalog: RecordCatalog,
  schema: GraphQLSchema,
  permissions: PermissionContext,
  object: RecordObject,
  depth: number,
  selectedNames?: string[],
): string => {
  const permission = permissions.objectRecordsPermissions.find(
    (permission) => permission.objectMetadataId === object.id,
  );
  if (!permission?.canReadAllRecords)
    throw apiError('Object cannot be read', 'FORBIDDEN');
  const recordType = schema.getType(object.typeName);
  if (!isObjectType(recordType)) throw apiError('Record type is missing');
  if (selectedNames?.some((name) => !recordType.getFields()[name]))
    throw apiError('Unknown REST field');
  return Object.entries(recordType.getFields())
    .flatMap(([name, field]) => {
      if (selectedNames && !selectedNames.includes(name) && name !== 'id')
        return [];
      const metadata = recordField(object, name);
      if (metadata && permission.unreadableFields.includes(metadata.id)) {
        if (selectedNames?.includes(name))
          throw apiError('Field cannot be read', 'FORBIDDEN');
        return [];
      }
      const type = getNamedType(field.type);
      if (isLeafType(type)) return [name];
      if (metadata && ['RELATION', 'MORPH_RELATION'].includes(metadata.type)) {
        if (depth === 0) return [];
        const target = catalog.objectsById.get(
          metadata.relationTargetObjectMetadataId ?? '',
        );
        if (
          !target ||
          !permissions.objectRecordsPermissions.some(
            (permission) =>
              permission.objectMetadataId === target.id &&
              permission.canReadAllRecords,
          )
        ) {
          if (selectedNames?.includes(name))
            throw apiError('Related object cannot be read', 'FORBIDDEN');
          return [];
        }
        const nested = restRecordSelection(
          catalog,
          schema,
          permissions,
          target,
          depth - 1,
        );
        return [
          `${name} { ${metadata.settings?.relationType === 'ONE_TO_MANY' ? `edges { node { ${nested} } }` : nested} }`,
        ];
      }
      if (!isObjectType(type)) return [];
      const nested = Object.entries(type.getFields())
        .flatMap(([name, field]) =>
          isLeafType(getNamedType(field.type)) &&
          !field.args.some((argument) => String(argument.type).endsWith('!'))
            ? [name]
            : [],
        )
        .join(' ');
      return nested ? [`${name} { ${nested} }`] : [];
    })
    .join(' ');
};
