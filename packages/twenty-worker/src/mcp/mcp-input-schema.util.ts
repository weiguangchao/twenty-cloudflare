import {
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
  type GraphQLInputType,
} from 'graphql';

import { recordField } from '@/workspace/record-api/record-catalog.util';
import { recordAggregations } from '@/workspace/record-api/schema/record-aggregations.util';
import { type RecordQueryContext } from '@/workspace/record-api/types/record-query.type';
import { canObjectBeManagedByAutomation } from 'twenty-shared/workflow';
import { isPlainObject } from 'twenty-shared/utils';
import { apiError } from '@/shared/errors/api-error.util';

export const validateMcpInputLists = (
  value: unknown,
  type: GraphQLInputType,
): void => {
  if (value === undefined || value === null) return;
  if (isNonNullType(type)) return validateMcpInputLists(value, type.ofType);
  if (isListType(type)) {
    // GraphQL accepts singletons for lists; MCP advertises JSON Schema arrays.
    if (!Array.isArray(value))
      throw apiError('Tool list arguments must be arrays');
    for (const item of value) validateMcpInputLists(item, type.ofType);
  } else if (isInputObjectType(type) && isPlainObject(value)) {
    for (const [name, item] of Object.entries(value)) {
      const field = type.getFields()[name];
      if (field) validateMcpInputLists(item, field.type);
    }
  }
};

export const createMcpInputTypes = (context: RecordQueryContext) => {
  const types = new Map<string, GraphQLInputObjectType>();
  const allowed = (typeName: string, name: string) => {
    if (['regex', 'iregex'].includes(name)) return false;
    for (const object of context.catalog.objects) {
      const suffix = typeName.slice(object.typeName.length);
      if (!typeName.startsWith(object.typeName)) continue;
      const permission = context.permissions.objectRecordsPermissions.find(
        (permission) => permission.objectMetadataId === object.id,
      );
      if (suffix === 'RelationInput') {
        if (name === 'create')
          return (
            permission?.canCreateAllRecords &&
            canObjectBeManagedByAutomation(object)
          );
        return name === 'disconnect' || permission?.canReadAllRecords;
      }
      if (suffix === 'OrderByWithGroupByAggregateInput') {
        const field = recordAggregations(object).get(name)?.field;
        return !field || !permission?.unreadableFields.includes(field.id);
      }
      if (
        ![
          'CreateInput',
          'UpdateInput',
          'FilterInput',
          'OrderByInput',
          'OrderByWithGroupByInput',
          'GroupByInput',
          'WhereUniqueInput',
        ].includes(suffix)
      )
        continue;
      if (['and', 'or', 'not', 'aggregate'].includes(name)) return true;
      const field = recordField(object, name);
      const targetPermission = field.relationTargetObjectMetadataId
        ? context.permissions.objectRecordsPermissions.find(
            (permission) =>
              permission.objectMetadataId ===
              field.relationTargetObjectMetadataId,
          )
        : undefined;
      if (
        field.relationTargetObjectMetadataId &&
        !targetPermission?.canReadAllRecords
      )
        return false;
      const write = ['CreateInput', 'UpdateInput'].includes(suffix);
      return (
        permission?.canReadAllRecords &&
        !permission.unreadableFields.includes(field.id) &&
        (!write ||
          (!permission.uneditableFields.includes(field.id) &&
            (suffix !== 'UpdateInput' || name !== 'id') &&
            ![
              'createdAt',
              'updatedAt',
              'deletedAt',
              'createdBy',
              'updatedBy',
              'searchVector',
            ].includes(name)))
      );
    }
    return true;
  };
  const inputType = (type: GraphQLInputType): GraphQLInputType => {
    if (isNonNullType(type))
      return new GraphQLNonNull(
        inputType(type.ofType) as Exclude<
          GraphQLInputType,
          GraphQLNonNull<GraphQLInputType>
        >,
      );
    if (isListType(type)) return new GraphQLList(inputType(type.ofType));
    if (!isInputObjectType(type)) return type;
    const cached = types.get(type.name);
    if (cached) return cached;
    const filtered = new GraphQLInputObjectType({
      name: `Mcp${type.name}`,
      fields: () =>
        Object.fromEntries(
          Object.entries(type.getFields())
            .filter(([name]) => allowed(type.name, name))
            .map(([name, field]) => [
              name,
              {
                type: inputType(field.type),
                description: field.description,
                defaultValue: field.defaultValue,
              },
            ]),
        ),
    });
    types.set(type.name, filtered);
    return filtered;
  };
  return inputType;
};

export const mcpInputSchema = (input: GraphQLInputObjectType) => {
  const definitions: Record<string, unknown> = {};
  const convert = (type: GraphQLInputType): Record<string, unknown> => {
    if (isNonNullType(type)) return nonNull(type.ofType);
    return { anyOf: [nonNull(type), { type: 'null' }] };
  };
  const objectSchema = (type: GraphQLInputObjectType) => ({
    type: 'object',
    properties: Object.fromEntries(
      Object.entries(type.getFields()).map(([name, field]) => [
        name,
        {
          ...convert(field.type),
          ...(field.defaultValue !== undefined
            ? { default: field.defaultValue }
            : {}),
          ...(field.description ? { description: field.description } : {}),
        },
      ]),
    ),
    required: Object.values(type.getFields())
      .filter(
        (field) =>
          isNonNullType(field.type) && field.defaultValue === undefined,
      )
      .map((field) => field.name),
    additionalProperties: false,
  });
  const nonNull = (type: GraphQLInputType): Record<string, unknown> => {
    if (isListType(type)) return { type: 'array', items: convert(type.ofType) };
    if (isEnumType(type))
      return {
        type: 'string',
        enum: type.getValues().map((value) => value.name),
      };
    if (isInputObjectType(type)) {
      if (!(type.name in definitions)) {
        definitions[type.name] = {};
        definitions[type.name] = objectSchema(type);
      }
      return { $ref: `#/definitions/${type.name}` };
    }
    if (type.name === 'Boolean') return { type: 'boolean' };
    if (type.name === 'Int') return { type: 'integer' };
    if (type.name === 'Float') return { type: 'number' };
    if (['BigInt', 'BigFloat', 'Position'].includes(type.name))
      return { anyOf: [{ type: 'number' }, { type: 'string' }] };
    if (['JSON', 'JSONObject'].includes(type.name)) return {};
    return {
      type: 'string',
      ...(type.name === 'UUID' ? { format: 'uuid' } : {}),
    };
  };
  return { ...objectSchema(input), definitions };
};
