import {
  coerceInputValue,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  type GraphQLInputFieldConfigMap,
  type GraphQLInputType,
} from 'graphql';
import { camelToSnakeCase, capitalize, isPlainObject } from 'crm-shared/utils';
import { canObjectBeManagedByAutomation } from 'crm-shared/workflow';

import {
  createMcpInputTypes,
  mcpInputSchema,
  validateMcpInputLists,
} from '@/mcp/mcp-input-schema.util';
import { type McpTool } from '@/mcp/types/mcp.type';
import { apiError } from '@/shared/errors/api-error.util';
import { restRecordSelection } from '@/workspace/integrations/rest-record-selection.util';
import { recordAggregations } from '@/workspace/record-api/schema/record-aggregations.util';
import {
  type RecordQueryContext,
  type RecordQueryInput,
} from '@/workspace/record-api/types/record-query.type';

export const listMcpTool = (tool: McpTool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: mcpInputSchema(tool.inputType),
  annotations: {
    readOnlyHint: tool.readOnly,
    destructiveHint: !tool.readOnly,
    idempotentHint: tool.readOnly,
    openWorldHint: false,
  },
});

export const buildMcpTools = (
  context: RecordQueryContext,
  executeQuery: (input: RecordQueryInput) => string,
) => {
  const tools = new Map<string, McpTool>();
  const inputType = createMcpInputTypes(context);
  const add = (
    name: string,
    description: string,
    fields: GraphQLInputFieldConfigMap,
    execute: McpTool['execute'],
    readOnly = true,
    category = 'DATABASE_CRUD',
  ) => {
    tools.set(name, {
      name,
      description,
      category,
      readOnly,
      execute,
      inputType: new GraphQLInputObjectType({
        name: `McpTool_${name}`,
        fields,
      }),
    });
  };
  const run = (
    operation: string,
    variables: Record<string, unknown>,
    selection: string,
    mutation = false,
  ): unknown => {
    const field = (
      mutation
        ? context.schema.getMutationType()
        : context.schema.getQueryType()
    )!.getFields()[operation];
    const definitions = Object.keys(variables).map((name) => {
      const argument = field.args.find((argument) => argument.name === name);
      if (!argument) throw apiError('Invalid tool argument');
      return `$${name}: ${String(argument.type)}`;
    });
    const parameters = Object.keys(variables).map(
      (name) => `${name}: $${name}`,
    );
    const result = JSON.parse(
      executeQuery({
        query: `${mutation ? 'mutation' : 'query'}${definitions.length ? `(${definitions.join(', ')})` : ''} { ${operation}${parameters.length ? `(${parameters.join(', ')})` : ''} { ${selection} } }`,
        variables,
      }),
    ) as {
      data?: Record<string, unknown>;
      errors?: { message: string; extensions?: { code?: string } }[];
    };
    if (result.errors?.length)
      throw apiError(
        result.errors[0].message,
        result.errors[0].extensions?.code,
      );
    return result.data?.[operation];
  };
  const objects = context.catalog.objects.filter((object) =>
    context.permissions.objectRecordsPermissions.some(
      (permission) =>
        permission.objectMetadataId === object.id &&
        permission.canReadAllRecords,
    ),
  );
  for (const object of objects) {
    const permission = context.permissions.objectRecordsPermissions.find(
      (permission) => permission.objectMetadataId === object.id,
    )!;
    const plural = camelToSnakeCase(object.namePlural);
    const singular = camelToSnakeCase(object.nameSingular);
    const argumentType = (operation: string, name: string, mutation = false) =>
      inputType(
        (mutation
          ? context.schema.getMutationType()
          : context.schema.getQueryType())!
          .getFields()
          [operation].args.find((argument) => argument.name === name)!.type,
      );
    const filterType = argumentType(object.namePlural, 'filter');
    const selection = (select?: unknown) => {
      if (
        select !== undefined &&
        (!Array.isArray(select) ||
          !select.length ||
          !select.every((name) => typeof name === 'string'))
      )
        throw apiError('select must be a non-empty array of field names');
      return restRecordSelection(
        context.catalog,
        context.schema,
        context.permissions,
        object,
        1,
        Array.isArray(select) && !select.includes('*') ? select : undefined,
      );
    };
    const selectedFields = {
      select: {
        type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
        description: 'Fields to return, or ["*"] for all readable fields.',
      },
    };
    const filterFields = (filterType as GraphQLInputObjectType).toConfig()
      .fields;
    add(
      `find_many_${plural}`,
      `Find ${object.labelPlural}. Pass field filters as top-level arguments, combined with and/or/not. Use limit and offset until hasNextPage is false.`,
      {
        ...filterFields,
        limit: { type: GraphQLInt, defaultValue: 10 },
        offset: { type: GraphQLInt, defaultValue: 0 },
        orderBy: { type: argumentType(object.namePlural, 'orderBy') },
        ...selectedFields,
      },
      ({ limit, offset, orderBy, select, ...filter }) => {
        if (
          !Number.isInteger(limit) ||
          Number(limit) < 1 ||
          Number(limit) > 100
        )
          throw apiError('limit must be between 1 and 100');
        const connection = run(
          object.namePlural,
          { first: limit, offset, ...(orderBy ? { orderBy } : {}), filter },
          `edges { node { ${selection(select)} } } totalCount pageInfo { hasNextPage endCursor }`,
        ) as {
          edges: { node: unknown }[];
          totalCount: number;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
        return {
          records: connection.edges.map((edge) => edge.node),
          count: connection.totalCount,
          hasNextPage: connection.pageInfo.hasNextPage,
          endCursor: connection.pageInfo.endCursor,
        };
      },
    );
    add(
      `find_one_${singular}`,
      `Read one ${object.labelSingular} by ID.`,
      { id: { type: new GraphQLNonNull(GraphQLString) }, ...selectedFields },
      ({ id, select }) => ({
        record: run(
          object.nameSingular,
          { filter: { id: { eq: id } } },
          selection(select),
        ),
      }),
    );
    const aggregateNames = [...recordAggregations(object)]
      .filter(
        ([, aggregation]) =>
          !aggregation.field ||
          !permission.unreadableFields.includes(aggregation.field.id),
      )
      .map(([name]) => name);
    const aggregateFields = (aggregate: unknown) => {
      if (
        !Array.isArray(aggregate) ||
        !aggregate.length ||
        !aggregate.every(
          (name) => typeof name === 'string' && aggregateNames.includes(name),
        )
      )
        throw apiError(
          'Select readable aggregate names from the tool description',
        );
      return aggregate.join(' ');
    };
    const aggregationInput = {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      defaultValue: ['totalCount'],
      description: `Aggregate names: ${aggregateNames.join(', ')}`,
    };
    add(
      `aggregate_${plural}`,
      `Aggregate ${object.labelPlural} over the complete filtered result.`,
      { filter: { type: filterType }, aggregates: aggregationInput },
      ({ filter, aggregates }) => ({
        aggregates: run(
          object.namePlural,
          { filter },
          aggregateFields(aggregates),
        ),
      }),
    );
    const groupOperation = `${object.namePlural}GroupBy`;
    add(
      `group_by_${plural}`,
      `Group ${object.labelPlural} and compute aggregates. Date groups require an IANA timeZone and granularity.`,
      {
        groupBy: { type: argumentType(groupOperation, 'groupBy') },
        filter: { type: filterType },
        orderBy: { type: argumentType(groupOperation, 'orderBy') },
        aggregates: aggregationInput,
      },
      ({ aggregates, ...variables }) => ({
        groups: run(
          groupOperation,
          variables,
          `groupByDimensionValues ${aggregateFields(aggregates)}`,
        ),
      }),
    );
    if (
      !canObjectBeManagedByAutomation(object) ||
      object.nameSingular === 'timelineActivity'
    )
      continue;
    const addMutation = (
      verb: string,
      many: boolean,
      permitted: boolean,
      upsert = false,
    ) => {
      if (!permitted) return;
      const operation = `${verb}${many ? capitalize(object.namePlural) : object.typeName}`;
      const name = `${upsert ? 'upsert' : verb}_${many ? 'many' : 'one'}_${many ? plural : singular}`;
      const fields: GraphQLInputFieldConfigMap = {};
      if (['create', 'update'].includes(verb)) {
        const dataType = argumentType(operation, 'data', true);
        if (!many)
          Object.assign(
            fields,
            (
              dataType as GraphQLNonNull<GraphQLInputObjectType>
            ).ofType.toConfig().fields,
          );
        else
          fields[verb === 'create' ? 'records' : 'data'] = { type: dataType };
      }
      if (verb !== 'create') {
        if (many)
          fields.filter = { type: argumentType(operation, 'filter', true) };
        else fields.id = { type: argumentType(operation, 'id', true) };
      }
      add(
        name,
        `${capitalize(verb)} ${many ? object.labelPlural : object.labelSingular}${upsert ? ' by unique fields' : ''}. ${['delete', 'restore'].includes(verb) ? 'Deletion is soft and reversible.' : verb === 'destroy' ? 'Permanently deletes records.' : 'Batch writes are atomic, with at most 200 affected records.'}`,
        fields,
        (parameters) => {
          let variables: Record<string, unknown>;
          if (verb === 'create')
            variables = {
              data: many ? parameters.records : parameters,
              ...(upsert ? { upsert: true } : {}),
            };
          else if (verb === 'update' && !many) {
            const { id, ...data } = parameters;
            variables = { id, data };
          } else variables = parameters;
          const result = run(operation, variables, selection(), true);
          return many ? { records: result } : { record: result };
        },
        false,
      );
    };
    for (const many of [false, true]) {
      addMutation('create', many, permission.canCreateAllRecords);
      addMutation('update', many, permission.canUpdateAllRecords);
      addMutation('delete', many, permission.canSoftDeleteAllRecords);
      addMutation('restore', many, permission.canUpdateAllRecords);
      addMutation('destroy', many, permission.canDestroyAllRecords);
    }
    addMutation(
      'create',
      true,
      permission.canCreateAllRecords && permission.canUpdateAllRecords,
      true,
    );
    if (
      !object.isSystem &&
      permission.canUpdateAllRecords &&
      permission.canSoftDeleteAllRecords &&
      permission.canDestroyAllRecords
    ) {
      const operation = `merge${capitalize(object.namePlural)}`;
      add(
        `merge_many_${plural}`,
        `Merge duplicate ${object.labelPlural}, preserving relations. Other records are permanently deleted. Use dryRun: true to preview.`,
        Object.fromEntries(
          context.schema
            .getMutationType()!
            .getFields()
            [operation].args.map((argument) => [
              argument.name,
              { type: inputType(argument.type) },
            ]),
        ),
        (variables) => ({
          record: run(operation, variables, selection(), true),
        }),
        false,
      );
    }
  }
  add(
    'list_object_metadata_names',
    'List readable object plural names for constructing tool names.',
    {},
    () => ({
      objectNames: objects
        .map((object) => camelToSnakeCase(object.namePlural))
        .sort(),
    }),
    true,
    'METADATA',
  );
  add(
    'get_object_metadata',
    'List readable CRM objects and optionally their readable fields.',
    {
      id: { type: GraphQLString },
      objectName: { type: GraphQLString },
      includeFields: { type: GraphQLBoolean, defaultValue: false },
      limit: { type: GraphQLInt, defaultValue: 100 },
    },
    (parameters) => {
      if (
        !Number.isInteger(parameters.limit) ||
        Number(parameters.limit) < 1 ||
        Number(parameters.limit) > 100
      )
        throw apiError('limit must be between 1 and 100');
      return {
        objects: objects
          .filter(
            (object) =>
              (!parameters.id || object.id === parameters.id) &&
              (!parameters.objectName ||
                [object.nameSingular, object.namePlural].includes(
                  String(parameters.objectName),
                )),
          )
          .slice(0, Number(parameters.limit))
          .map((object) => ({
            id: object.id,
            nameSingular: object.nameSingular,
            namePlural: object.namePlural,
            labelSingular: object.labelSingular,
            labelPlural: object.labelPlural,
            ...(parameters.includeFields
              ? {
                  fields: object.fields
                    .filter(
                      (field) =>
                        !context.permissions.objectRecordsPermissions
                          .find(
                            (permission) =>
                              permission.objectMetadataId === object.id,
                          )!
                          .unreadableFields.includes(field.id),
                    )
                    .map((field) => ({
                      id: field.id,
                      name: field.name,
                      type: field.type,
                      label: field.label,
                      isNullable: field.isNullable,
                      options: field.options,
                    })),
                }
              : {}),
          })),
      };
    },
    true,
    'METADATA',
  );
  add(
    'search',
    'Search readable CRM records across standard and custom objects.',
    Object.fromEntries(
      context.schema
        .getQueryType()!
        .getFields()
        .search.args.map((argument) => [
          argument.name,
          {
            type: inputType(argument.type),
            ...(argument.name === 'limit' ? { defaultValue: 20 } : {}),
          },
        ]),
    ),
    (parameters) => ({
      search: run(
        'search',
        parameters,
        'edges { node { recordId objectNameSingular objectLabelSingular label imageUrl } cursor } pageInfo { hasNextPage endCursor }',
      ),
    }),
  );
  add(
    'get_tool_catalog',
    'Discover available CRM tools, optionally filtered by category.',
    {
      categories: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
    },
    ({ categories }) => {
      const catalog: Record<string, { name: string; description: string }[]> =
        {};
      for (const tool of tools.values()) {
        if (
          tool.category === 'DISCOVERY' ||
          (Array.isArray(categories) && !categories.includes(tool.category))
        )
          continue;
        (catalog[tool.category] ??= []).push({
          name: tool.name,
          description: tool.description,
        });
      }
      return { catalog };
    },
    true,
    'DISCOVERY',
  );
  add(
    'learn_tools',
    'Get descriptions and input schemas for tools before executing them.',
    {
      toolNames: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(GraphQLString)),
        ),
      },
      aspects: {
        type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
        defaultValue: ['description', 'schema'],
      },
    },
    ({ toolNames, aspects }) => {
      const names = toolNames as string[];
      if (names.length > 20) throw apiError('Learn at most 20 tools per call');
      if (
        !Array.isArray(aspects) ||
        !aspects.every((aspect) =>
          ['description', 'schema'].includes(String(aspect)),
        )
      )
        throw apiError('aspects must contain description or schema');
      return {
        tools: names.flatMap((name) =>
          tools.has(name)
            ? [
                {
                  name,
                  ...(aspects.includes('description')
                    ? { description: tools.get(name)!.description }
                    : {}),
                  ...(aspects.includes('schema')
                    ? {
                        inputSchema: mcpInputSchema(tools.get(name)!.inputType),
                      }
                    : {}),
                },
              ]
            : [],
        ),
        notFound: names.filter((name) => !tools.has(name)),
      };
    },
    true,
    'DISCOVERY',
  );
  add(
    'execute_tool',
    'Execute a CRM tool using the schema returned by learn_tools.',
    {
      toolName: { type: new GraphQLNonNull(GraphQLString) },
      arguments: { type: context.schema.getType('JSON') as GraphQLInputType },
    },
    ({ toolName, arguments: arguments_ }) => {
      if (tools.get(String(toolName))?.category === 'DISCOVERY')
        throw apiError('Discovery tools must be called directly');
      return executeMcpTool(tools, String(toolName), arguments_);
    },
    false,
    'DISCOVERY',
  );
  return tools;
};

export const executeMcpTool = (
  tools: Map<string, McpTool>,
  name: string,
  arguments_: unknown,
) => {
  const tool = tools.get(name);
  if (!tool) throw apiError('Tool is unavailable');
  if (arguments_ !== undefined && !isPlainObject(arguments_))
    throw apiError('Tool arguments must be an object');
  validateMcpInputLists(arguments_ ?? {}, tool.inputType);
  const input = coerceInputValue(arguments_ ?? {}, tool.inputType) as Record<
    string,
    unknown
  >;
  return tool.execute(input);
};
