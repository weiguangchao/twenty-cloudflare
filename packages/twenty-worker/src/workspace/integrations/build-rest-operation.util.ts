import { type GraphQLSchema } from 'graphql';
import { capitalize, isPlainObject, isValidUuid } from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { parseRestFilter } from '@/workspace/integrations/parse-rest-filter.util';
import { restRecordSelection } from '@/workspace/integrations/rest-record-selection.util';
import { type RecordCatalog } from '@/workspace/record-api/types/record-query.type';
import { type PermissionContext } from '@/workspace/permissions/types/permission-context.type';

export type RestRequest = {
  method: string;
  path: string[];
  query: Record<string, string>;
  body?: unknown;
  origin: string;
  workspaceId: string;
};

export const buildRestOperation = (
  input: RestRequest,
  catalog: RecordCatalog,
  schema: GraphQLSchema,
  permissions: PermissionContext,
) => {
  const path = [...input.path];
  const batch = path[0] === 'batch';
  if (batch) path.shift();
  const object = catalog.objects.find(
    (object) => object.namePlural === path[0],
  );
  if (!object) throw apiError('Object not found', 'NOT_FOUND');
  const action = path.at(-1) === 'restore' ? 'restore' : undefined;
  if (action) path.pop();
  if (
    path.length > 2 ||
    (path[1] && !isValidUuid(path[1])) ||
    (batch && (input.method !== 'POST' || path.length !== 1)) ||
    (action && input.method !== 'PATCH')
  )
    throw apiError('Invalid REST path');
  const id = path[1];
  const plural = batch || !id;
  const query = input.query;
  const filter = parseRestFilter(query.filter);
  const variables: Record<string, unknown> = {};
  let operation: string;
  const isQuery = input.method === 'GET';
  if (isQuery) {
    operation = id ? object.nameSingular : object.namePlural;
    if (id) variables.filter = { id: { eq: id } };
    else {
      variables.filter = filter;
      const limit = query.limit === undefined ? 60 : Number(query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 500)
        throw apiError('REST limit must be between 1 and 500');
      variables[query.ending_before ? 'last' : 'first'] = limit;
      if (query.starting_after) variables.after = query.starting_after;
      if (query.ending_before) variables.before = query.ending_before;
      if (query.offset) {
        const offset = Number(query.offset);
        if (!Number.isInteger(offset) || offset < 0)
          throw apiError('Invalid REST offset');
        variables.offset = offset;
      }
      if (query.order_by)
        variables.orderBy = query.order_by.startsWith('[')
          ? (JSON.parse(query.order_by) as unknown)
          : query.order_by.split(',').map((entry) => {
              const parts = entry.split('.');
              const direction = parts.pop();
              if (
                ![
                  'AscNullsFirst',
                  'AscNullsLast',
                  'DescNullsFirst',
                  'DescNullsLast',
                ].includes(direction ?? '') ||
                parts.some((part) => !/^[A-Za-z][A-Za-z0-9]*$/.test(part))
              )
                throw apiError('Invalid REST order');
              return parts
                .reverse()
                .reduce<unknown>(
                  (nested, field) => ({ [field]: nested }),
                  direction,
                );
            });
    }
  } else {
    const verb =
      action ??
      (input.method === 'POST'
        ? 'create'
        : input.method === 'PATCH' || input.method === 'PUT'
          ? 'update'
          : input.method === 'DELETE'
            ? query.soft_delete === 'true'
              ? 'delete'
              : 'destroy'
            : undefined);
    if (!verb) throw apiError('Unsupported REST method');
    if (verb === 'create' && id) throw apiError('Invalid create path');
    operation = `${verb}${capitalize(verb === 'create' ? (batch ? object.namePlural : object.nameSingular) : plural ? object.namePlural : object.nameSingular)}`;
    if (id) variables.id = id;
    else if (verb !== 'create') variables.filter = filter;
    if (verb === 'create' || verb === 'update') {
      if (
        batch
          ? !Array.isArray(input.body) || !input.body.every(isPlainObject)
          : !isPlainObject(input.body)
      )
        throw apiError('Invalid REST record input');
      variables.data = input.body;
      if (verb === 'create' && query.upsert === 'true') variables.upsert = true;
    }
  }
  const root = isQuery ? schema.getQueryType() : schema.getMutationType();
  const field = root?.getFields()[operation];
  if (!field) throw apiError('Unsupported REST operation');
  const argumentDefinitions = Object.keys(variables).map((name) => {
    const argument = field.args.find((argument) => argument.name === name);
    if (!argument) throw apiError(`Unsupported REST argument ${name}`);
    return `$${name}: ${String(argument.type)}`;
  });
  const depth = query.depth === undefined ? 1 : Number(query.depth);
  if (!Number.isInteger(depth) || depth < 0 || depth > 2)
    throw apiError('REST depth must be between 0 and 2');
  const selection = restRecordSelection(
    catalog,
    schema,
    permissions,
    object,
    depth,
    query.fields?.split(',').map((name) => name.trim()),
  );
  const connection = isQuery && !id;
  const resultSelection = connection
    ? `edges { node { ${selection} } cursor } totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor }`
    : selection;
  return {
    query: `${isQuery ? 'query' : 'mutation'}${argumentDefinitions.length ? `(${argumentDefinitions.join(', ')})` : ''} { ${operation}${
      Object.keys(variables).length
        ? `(${Object.keys(variables)
            .map((name) => `${name}: $${name}`)
            .join(', ')})`
        : ''
    } { ${resultSelection} } }`,
    variables,
    operation,
    objectNamePlural: object.namePlural,
    connection,
  };
};
