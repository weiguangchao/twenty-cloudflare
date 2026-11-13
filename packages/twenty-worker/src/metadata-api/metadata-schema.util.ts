import {
  buildSchema,
  defaultFieldResolver,
  getNamedType,
  isEnumType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isAbstractType,
  valueFromASTUntyped,
  type GraphQLOutputType,
} from 'graphql';
import { capitalize, isPlainObject, isValidUuid } from 'twenty-shared/utils';

import metadataSchema from '../../contract/metadata-schema.graphql';

import {
  AUTH_MUTATION_RESOLVERS,
  AUTH_QUERY_RESOLVERS,
} from '@/metadata-api/auth.resolvers';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';
import {
  METADATA_QUERY_RESOLVERS,
  METADATA_MUTATION_RESOLVERS,
} from '@/metadata-api/metadata-read.resolvers';
import { METADATA_FIELD_RESOLVERS } from '@/metadata-api/metadata-field.resolvers';
import { createHeartbeatStream } from '@/metadata-api/subscriptions/create-heartbeat-stream.util';

const zeroValue = (type: GraphQLOutputType): unknown => {
  if (!isNonNullType(type)) return null;
  const inner = type.ofType;
  if (isListType(inner)) return [];
  const named = getNamedType(inner);
  if (isObjectType(named)) return {};
  if (isEnumType(named)) return named.getValues()[0].value;
  if (named.name === 'Boolean') return false;
  if (named.name === 'Int' || named.name === 'Float') return 0;
  if (named.name === 'JSON' || named.name === 'JSONObject') return {};
  return '';
};

const scalarValue = (name: string, value: unknown): unknown => {
  if (name === 'UUID') {
    if (typeof value !== 'string' || !isValidUuid(value))
      throw apiError('Invalid UUID');
    return value.toLowerCase();
  }
  if (name === 'DateTime') {
    if (!(value instanceof Date) && typeof value !== 'string')
      throw apiError('Invalid date');
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw apiError('Invalid date');
    return date.toISOString();
  }
  if (name === 'JSONObject' && !isPlainObject(value))
    throw apiError('Expected a JSON object');
  if (name === 'BigInt') return String(value);
  if (name === 'ConnectionCursor' && typeof value !== 'string')
    throw apiError('Invalid cursor');
  return value;
};

export const buildMetadataSchema = () => {
  const schema = buildSchema(metadataSchema);
  const query = schema.getQueryType()!;
  const mutation = schema.getMutationType()!;
  const subscription = schema.getSubscriptionType()!;

  for (const type of Object.values(schema.getTypeMap())) {
    if (isAbstractType(type) && type.name === 'CommandMenuItemPayload') {
      type.resolveType = (value: unknown) => {
        if (!isPlainObject(value)) return undefined;
        return typeof value.path === 'string'
          ? 'PathCommandMenuItemPayload'
          : typeof value.objectMetadataId === 'string'
            ? 'ObjectMetadataCommandMenuItemPayload'
            : undefined;
      };
    }
    if (
      isAbstractType(type) &&
      ['WidgetConfiguration', 'PageLayoutWidgetPosition'].includes(type.name)
    ) {
      type.resolveType = (value: unknown) => {
        if (!isPlainObject(value)) return undefined;
        const discriminator =
          type.name === 'WidgetConfiguration'
            ? value.configurationType
            : value.layoutMode;
        if (typeof discriminator !== 'string') return undefined;
        const name = discriminator
          .toLowerCase()
          .split('_')
          .map(capitalize)
          .join('');
        return type.name === 'WidgetConfiguration'
          ? `${name}Configuration`
          : `PageLayoutWidget${name}Position`;
      };
    }
    if (
      isScalarType(type) &&
      !type.name.startsWith('__') &&
      !['String', 'Int', 'Float', 'Boolean', 'ID'].includes(type.name)
    ) {
      type.serialize = (value) => scalarValue(type.name, value);
      type.parseValue = (value) => scalarValue(type.name, value);
      type.parseLiteral = (node, variables) =>
        scalarValue(type.name, valueFromASTUntyped(node, variables));
    }
    if (!isObjectType(type) || type.name.startsWith('__')) continue;
    for (const field of Object.values(type.getFields())) {
      if (type === query) {
        field.resolve =
          METADATA_QUERY_RESOLVERS[field.name] ??
          AUTH_QUERY_RESOLVERS[field.name] ??
          (async (_source, _arguments, context: MetadataContext) => {
            await context.requireAuth();
            return isListType(
              isNonNullType(field.type) ? field.type.ofType : field.type,
            )
              ? []
              : zeroValue(field.type);
          });
      } else if (type === mutation) {
        field.resolve =
          METADATA_MUTATION_RESOLVERS[field.name] ??
          AUTH_MUTATION_RESOLVERS[field.name] ??
          (async (_source, _arguments, context: MetadataContext) => {
            await context.requireAuth();
            throw apiError(
              `Mutation ${field.name} is not implemented`,
              'NOT_IMPLEMENTED',
            );
          });
      } else if (
        type === subscription &&
        field.name === 'onEventSubscription'
      ) {
        field.subscribe = async (
          _source,
          { eventStreamId }: { eventStreamId: string },
          context: MetadataContext,
        ) => {
          await context.requireMetadata();
          return createHeartbeatStream(eventStreamId, context.request.signal);
        };
        field.resolve = (value: unknown) => value;
      } else {
        field.resolve =
          METADATA_FIELD_RESOLVERS[type.name]?.[field.name] ??
          ((source, arguments_, context, info) => {
            const value: unknown = defaultFieldResolver(
              source,
              arguments_,
              context,
              info,
            );
            return value === undefined ? zeroValue(field.type) : value;
          });
      }
    }
  }

  return schema;
};
