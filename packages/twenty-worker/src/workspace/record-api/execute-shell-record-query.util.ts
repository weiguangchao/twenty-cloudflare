import {
  buildSchema,
  defaultFieldResolver,
  getNamedType,
  graphqlSync,
  isListType,
  isNonNullType,
  isObjectType,
} from 'graphql';
import { isPlainObject } from 'twenty-shared/utils';

import coreSchema from '../../../contract/core-schema.graphql';

import { apiError } from '@/shared/errors/api-error.util';
import { type getWorkspaceMember } from '@/workspace/lifecycle/workspace-members.util';

type WorkspaceMember = NonNullable<ReturnType<typeof getWorkspaceMember>>;
type ShellQueryContext = { members: WorkspaceMember[] };

const matchesMember = (member: unknown, filter: unknown): boolean => {
  if (!isPlainObject(filter) || !isPlainObject(member)) return false;
  return Object.entries(filter).every(([key, comparison]) => {
    if (key === 'and' || key === 'or') {
      if (!Array.isArray(comparison)) throw apiError('Invalid member filter');
      return key === 'and'
        ? comparison.every((item) => matchesMember(member, item))
        : comparison.some((item) => matchesMember(member, item));
    }
    if (key === 'not') return !matchesMember(member, comparison);
    if (!isPlainObject(comparison)) throw apiError('Invalid member filter');
    const value = member[key];
    if (isPlainObject(value)) return matchesMember(value, comparison);
    return Object.entries(comparison).every(([operator, expected]) => {
      switch (operator) {
        case 'eq':
          return value === expected;
        case 'neq':
          return value !== expected;
        case 'in':
          return Array.isArray(expected) && expected.includes(value);
        case 'is':
          return expected === 'NULL' ? value === null : value !== null;
        case 'ilike':
        case 'like': {
          if (typeof expected !== 'string')
            throw apiError('Invalid member filter');
          const term = expected.replace(/^%|%$/g, '');
          const text = String(value ?? '');
          return operator === 'ilike'
            ? text.toLowerCase().includes(term.toLowerCase())
            : text.includes(term);
        }
        default:
          throw apiError(
            `Member filter ${operator} requires the record query engine`,
            'NOT_IMPLEMENTED',
          );
      }
    });
  });
};

const emptyConnection = () => ({
  edges: [],
  totalCount: 0,
  pageInfo: {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  },
});

const buildShellSchema = () => {
  const schema = buildSchema(coreSchema);
  const query = schema.getQueryType();
  const mutation = schema.getMutationType();
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) || type.name.startsWith('__')) continue;
    for (const field of Object.values(type.getFields())) {
      field.resolve = (
        source: Record<string, unknown> | undefined,
        arguments_,
        context: ShellQueryContext,
        info,
      ) => {
        if (type === mutation)
          throw apiError(
            'Record mutations are not implemented',
            'NOT_IMPLEMENTED',
          );
        const named = getNamedType(field.type);
        if (
          type === query &&
          ['workspaceMembers', 'workspaceMember'].includes(field.name)
        ) {
          const members = context.members.filter((member) =>
            matchesMember(member, arguments_.filter ?? {}),
          );
          if (field.name === 'workspaceMember') return members[0] ?? null;
          if (
            arguments_.orderBy ||
            arguments_.after ||
            arguments_.before ||
            arguments_.last
          )
            throw apiError(
              'Member ordering and cursor queries require the record query engine',
              'NOT_IMPLEMENTED',
            );
          const first = arguments_.first ?? 60;
          const offset = arguments_.offset ?? 0;
          if (
            !Number.isInteger(first) ||
            first < 0 ||
            first > 1000 ||
            !Number.isInteger(offset) ||
            offset < 0
          )
            throw apiError('Invalid member page size');
          const edges = members
            .slice(offset, offset + first)
            .map((node, position) => ({
              node,
              cursor: btoa(
                JSON.stringify({ id: node.id, position: offset + position }),
              ),
            }));
          return {
            edges,
            totalCount: members.length,
            pageInfo: {
              hasNextPage: offset + first < members.length,
              hasPreviousPage: offset > 0,
              startCursor: edges[0]?.cursor ?? null,
              endCursor: edges.at(-1)?.cursor ?? null,
            },
          };
        }
        const value: unknown = defaultFieldResolver(
          source,
          arguments_,
          context,
          info,
        );
        if (value !== undefined) return value;
        if (
          type === query &&
          isObjectType(named) &&
          !named.name.endsWith('Connection') &&
          !isListType(
            isNonNullType(field.type) ? field.type.ofType : field.type,
          )
        )
          return null;
        if (named.name.endsWith('Connection')) return emptyConnection();
        if (
          isListType(isNonNullType(field.type) ? field.type.ofType : field.type)
        )
          return [];
        if (!isNonNullType(field.type)) return null;
        if (named.name === 'Int' || named.name === 'Float') return 0;
        if (named.name === 'Boolean') return false;
        return null;
      };
    }
  }
  return schema;
};

let shellSchema: ReturnType<typeof buildShellSchema> | undefined;

// Stage 5 replaces the captured schema and empty connections with metadata-driven record queries.
export const executeShellRecordQuery = (
  input: {
    query: string;
    variables?: Record<string, unknown>;
    operationName?: string;
  },
  context: ShellQueryContext,
) => {
  shellSchema ??= buildShellSchema();
  return JSON.stringify(
    graphqlSync({
      schema: shellSchema,
      source: input.query,
      variableValues: input.variables,
      operationName: input.operationName,
      contextValue: context,
    }),
  );
};
