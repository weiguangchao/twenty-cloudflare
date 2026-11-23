import {
  buildSchema,
  isScalarType,
  parse,
  print,
  visit,
  valueFromASTUntyped,
  type DefinitionNode,
} from 'graphql';
import { capitalize, isValidUuid } from 'crm-shared/utils';

import capturedSchema from '../../../../contract/core-schema.graphql';

import { apiError } from '@/shared/errors/api-error.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import {
  COMPOSITE_GRAPHQL_TYPES,
  relationTarget,
} from '@/workspace/record-api/record-catalog.util';
import { recordAggregations } from '@/workspace/record-api/schema/record-aggregations.util';
import {
  type RecordCatalog,
  type RecordObject,
} from '@/workspace/record-api/types/record-query.type';
import {
  SEARCH_FIELD_DEFINITION,
  SEARCH_SCHEMA_DEFINITIONS,
} from '@/workspace/search/search-schema.constant';

let sharedDefinitions: Map<string, DefinitionNode> | undefined;

const commonDefinitions = (roots: Set<string>) => {
  sharedDefinitions ??= new Map(
    [
      ...parse(capturedSchema).definitions,
      ...parse(
        'scalar BigInt input BigIntFilter { eq: BigInt, neq: BigInt, gt: BigInt, gte: BigInt, lt: BigInt, lte: BigInt, in: [BigInt!], is: FilterIs, gtField: String, gteField: String, ltField: String, lteField: String }',
      ).definitions,
    ].flatMap((definition) =>
      'name' in definition && definition.name
        ? [[definition.name.value, definition] as const]
        : [],
    ),
  );
  const names = new Set<string>();
  const collect = (name: string) => {
    if (names.has(name)) return;
    names.add(name);
    const definition = sharedDefinitions!.get(name);
    if (definition)
      visit(definition, {
        NamedType: (node) => {
          collect(node.name.value);
        },
      });
  };
  for (const name of roots) collect(name);
  const definitions = [...names].flatMap((name) => {
    const definition = sharedDefinitions!.get(name);
    return definition ? [definition] : [];
  });
  // Captured successful writes still include the legacy blocknote property.
  for (const name of ['RichTextCreateInput', 'RichTextUpdateInput'])
    if (names.has(name))
      definitions.push(
        ...parse(`extend input ${name} {blocknote: String}`).definitions,
      );
  return definitions;
};

const SCALAR_TYPES: Record<string, [string, string]> = {
  UUID: ['UUID', 'UUIDFilter'],
  TEXT: ['String', 'StringFilter'],
  NUMBER: ['Float', 'FloatFilter'],
  NUMERIC: ['BigFloat', 'BigFloatFilter'],
  BOOLEAN: ['Boolean', 'BooleanFilter'],
  DATE: ['Date', 'DateFilter'],
  DATE_TIME: ['DateTime', 'DateTimeFilter'],
  POSITION: ['Position', 'FloatFilter'],
  RAW_JSON: ['JSON', 'RawJsonFilter'],
  FILES: ['[FileObject]', 'RawJsonFilter'],
  ARRAY: ['[String]', 'ArrayFilter'],
  TS_VECTOR: ['TSVector', 'TSVectorFilter'],
};

const fieldTypes = (object: RecordObject, field: FieldMetadataRow) => {
  const composite = COMPOSITE_GRAPHQL_TYPES[field.type];
  if (composite)
    return {
      output: composite,
      filter: `${composite}FilterInput`,
      order: `${composite}OrderByInput`,
      group: `${composite}GroupByInput`,
      create: `${composite}CreateInput`,
    };
  if (['SELECT', 'MULTI_SELECT', 'RATING'].includes(field.type)) {
    const name = `${object.typeName}${capitalize(field.name)}Enum`;
    return {
      output: field.type === 'MULTI_SELECT' ? `[${name}]` : name,
      filter: `${name}Filter`,
      order: 'OrderByDirection',
      group: 'Boolean',
      create: field.type === 'MULTI_SELECT' ? `[${name}]` : name,
    };
  }
  const [output, filter] =
    field.type === 'NUMBER' && field.settings?.dataType === 'INT'
      ? ['Int', 'IntFilter']
      : field.type === 'NUMBER' && field.settings?.dataType === 'BIGINT'
        ? ['BigInt', 'BigIntFilter']
        : (SCALAR_TYPES[field.type] ?? ['String', 'StringFilter']);
  return {
    output,
    filter,
    order: 'OrderByDirection',
    group: ['DATE', 'DATE_TIME'].includes(field.type)
      ? 'GroupByDateGranularityInput'
      : 'Boolean',
    create:
      field.type === 'FILES'
        ? '[FileItemInput]'
        : field.name === 'id'
          ? 'ID'
          : output,
  };
};

export const buildRecordSchema = (catalog: RecordCatalog) => {
  const definitions: string[] = [SEARCH_SCHEMA_DEFINITIONS];
  const roots = new Set([
    'UUID',
    'DateTime',
    'Date',
    'JSON',
    'Cursor',
    'PageInfo',
    'OrderByDirection',
    'GroupByDateGranularityInput',
    'OrderByDateGranularityInput',
    'UUIDFilter',
    'DateTimeFilter',
  ]);
  const queries: string[] = [SEARCH_FIELD_DEFINITION];
  const mutations: string[] = [];
  const addRoot = (name: string) => {
    for (const token of name.match(/[A-Za-z_][A-Za-z_0-9]*/g) ?? [])
      roots.add(token);
  };
  for (const object of catalog.objects) {
    const name = object.typeName;
    const fields: string[] = [],
      filters: string[] = [],
      orders: string[] = [],
      groups: string[] = [],
      creates: string[] = [],
      updates: string[] = [];
    const groupedOrders: string[] = [];
    const arguments_ = (targetName: string) =>
      `first: Int, last: Int, offset: Int, before: String, after: String, filter: ${targetName}FilterInput, orderBy: [${targetName}OrderByInput]`;
    for (const field of object.fields) {
      if (field.type === 'RELATION' || field.type === 'MORPH_RELATION') {
        const target = relationTarget(catalog, field);
        if (field.settings?.relationType === 'MANY_TO_ONE') {
          const column = field.settings.joinColumnName ?? `${field.name}Id`;
          fields.push(`${column}: ID`, `${field.name}: ${target.typeName}`);
          filters.push(
            `${column}: UUIDFilter`,
            `${field.name}: ${target.typeName}FilterInput`,
          );
          orders.push(
            `${column}: OrderByDirection`,
            `${field.name}: ${target.typeName}OrderByInput`,
          );
          groupedOrders.push(
            `${column}: OrderByDirection`,
            `${field.name}: ${target.typeName}OrderByWithGroupByInput`,
          );
          groups.push(`${field.name}: ${target.typeName}GroupByInput`);
          creates.push(
            `${column}: ID`,
            `${field.name}: ${target.typeName}RelationInput`,
          );
          updates.push(
            `${column}: ID`,
            `${field.name}: ${target.typeName}RelationInput`,
          );
        } else
          fields.push(
            `${field.name}(${arguments_(target.typeName)}): ${target.typeName}Connection`,
          );
        continue;
      }
      const types = fieldTypes(object, field);
      for (const value of Object.values(types)) addRoot(value);
      addRoot(types.create.replace(/CreateInput/g, 'UpdateInput'));
      if (['SELECT', 'MULTI_SELECT', 'RATING'].includes(field.type)) {
        const enumName = `${name}${capitalize(field.name)}Enum`;
        const values = field.options?.map((option) => option.value) ?? [
          'RATING_1',
          'RATING_2',
          'RATING_3',
          'RATING_4',
          'RATING_5',
        ];
        definitions.push(
          `enum ${enumName} { ${values.join(' ')} }`,
          `input ${enumName}Filter { eq: ${enumName}, neq: ${enumName}, in: [${enumName}], containsAny: [${enumName}], is: FilterIs, isEmptyArray: Boolean, gt: ${enumName}, gte: ${enumName}, lt: ${enumName}, lte: ${enumName} }`,
        );
      }
      const required = [
        'id',
        'createdAt',
        'updatedAt',
        'createdBy',
        'updatedBy',
        'position',
      ].includes(field.name);
      fields.push(`${field.name}: ${types.output}${required ? '!' : ''}`);
      filters.push(`${field.name}: ${types.filter}`);
      orders.push(`${field.name}: ${types.order}`);
      groupedOrders.push(
        `${field.name}: ${['DATE', 'DATE_TIME'].includes(field.type) ? 'OrderByDateGranularityInput' : types.order}`,
      );
      if (
        !['id', 'deletedAt', 'position', 'searchVector'].includes(field.name) &&
        !['FILES', 'RAW_JSON'].includes(field.type)
      )
        groups.push(`${field.name}: ${types.group}`);
      creates.push(`${field.name}: ${types.create}`);
      updates.push(
        `${field.name}: ${types.create.replace(/CreateInput/g, 'UpdateInput')}`,
      );
    }
    const aggregates = [...recordAggregations(object)].map(
      ([key, value]) => `${key}: ${value.type}`,
    );
    const connection = `${aggregates.join('\n')} edges: [${name}Edge!]! pageInfo: PageInfo!`;
    definitions.push(
      `type ${name} { ${fields.join('\n')} }`,
      `type ${name}Edge { node: ${name}!, cursor: Cursor! }`,
      `type ${name}Connection { ${connection} }`,
      `type ${name}GroupByConnection { ${connection} groupByDimensionValues: JSON! }`,
      `input ${name}FilterInput { ${filters.join('\n')} and: [${name}FilterInput], or: [${name}FilterInput], not: ${name}FilterInput }`,
      `input ${name}OrderByInput { ${orders.join('\n')} }`,
      `input ${name}GroupByInput { ${groups.join('\n') || 'id: Boolean'} }`,
      `input ${name}OrderByWithGroupByInput { aggregate: ${name}OrderByWithGroupByAggregateInput ${groupedOrders.join('\n')} }`,
      `input ${name}OrderByWithGroupByAggregateInput { ${[...recordAggregations(object).keys()].map((key) => `${key}: OrderByDirection`).join('\n')} }`,
      `input ${name}CreateInput { ${creates.join('\n')} }`,
      `input ${name}UpdateInput { ${updates.join('\n')} }`,
      `input ${name}WhereUniqueInput { id: ID ${object.indexes
        .filter((index) => index.isUnique && index.indexFields.length === 1)
        .flatMap((index) => {
          const field = object.fields.find(
            (field) => field.id === index.indexFields[0].fieldMetadataId,
          );
          if (!field || field.name === 'id') return [];
          if (!COMPOSITE_GRAPHQL_TYPES[field.type])
            return [`${field.name}: ${fieldTypes(object, field).create}`];
          const subFields: Record<string, string[]> = {
            EMAILS: ['primaryEmail'],
            LINKS: ['primaryLinkUrl'],
            PHONES: [
              'primaryPhoneNumber',
              'primaryPhoneCountryCode',
              'primaryPhoneCallingCode',
            ],
          };
          const properties = subFields[field.type];
          if (!properties) return [];
          const inputName = `${name}${capitalize(field.name)}WhereInput`;
          definitions.push(
            `input ${inputName} { ${properties.map((property) => `${property}: String`).join(' ')} }`,
          );
          return [`${field.name}: ${inputName}`];
        })
        .join(' ')} }`,
      `input ${name}ConnectInput { where: ${name}WhereUniqueInput }`,
      `input ${name}RelationInput { connect: ${name}ConnectInput, create: ${name}CreateInput, disconnect: Boolean }`,
    );
    queries.push(
      `${object.namePlural}(${arguments_(name)}): ${name}Connection`,
      `${object.nameSingular}(filter: ${name}FilterInput!): ${name}`,
      `${object.nameSingular}Duplicates(ids: [UUID], data: [${name}CreateInput]): [${name}Connection!]`,
      `${object.namePlural}GroupBy(groupBy: [${name}GroupByInput!]!, filter: ${name}FilterInput, orderBy: [${name}OrderByWithGroupByInput], orderByForRecords: [${name}OrderByInput], viewId: UUID, limit: Int, offsetForRecords: Int): [${name}GroupByConnection!]`,
    );
    mutations.push(
      `create${name}(data: ${name}CreateInput!, upsert: Boolean): ${name}`,
      `create${capitalize(object.namePlural)}(data: [${name}CreateInput!]!, upsert: Boolean): [${name}!]`,
      `update${name}(id: UUID!, data: ${name}UpdateInput!): ${name}`,
      `update${capitalize(object.namePlural)}(filter: ${name}FilterInput!, data: ${name}UpdateInput!): [${name}!]`,
      ...['delete', 'destroy', 'restore'].flatMap((operation) => [
        `${operation}${name}(id: UUID!): ${name}`,
        `${operation}${capitalize(object.namePlural)}(filter: ${name}FilterInput!): [${name}!]`,
      ]),
      `merge${capitalize(object.namePlural)}(ids: [UUID!]!, conflictPriorityIndex: Int!, dryRun: Boolean): ${name}`,
    );
  }
  const generatedNames = new Set(
    definitions.flatMap((definition) => [
      definition.match(/^(?:type|input|enum) (\w+)/)?.[1],
    ]),
  );
  const common = commonDefinitions(roots)
    .filter(
      (definition) =>
        !(
          'name' in definition &&
          definition.name &&
          generatedNames.has(definition.name.value)
        ),
    )
    .map((definition) => print(definition));
  const schema = buildSchema(
    [
      ...common,
      ...definitions,
      `type Query { ${queries.join('\n')} }`,
      `type Mutation { ${mutations.join('\n')} }`,
    ].join('\n'),
  );
  for (const type of Object.values(schema.getTypeMap())) {
    if (
      !isScalarType(type) ||
      ['String', 'ID', 'Int', 'Float', 'Boolean'].includes(type.name)
    )
      continue;
    const coerce = (value: unknown) => {
      if (
        type.name === 'UUID' &&
        (typeof value !== 'string' || !isValidUuid(value))
      )
        throw apiError('Invalid UUID');
      if (type.name === 'UUID') return (value as string).toLowerCase();
      if (type.name === 'DateTime') {
        if (typeof value !== 'string' && !(value instanceof Date))
          throw apiError('Invalid date');
        const date = new Date(value as string);
        if (!Number.isFinite(date.getTime())) throw apiError('Invalid date');
        return date.toISOString();
      }
      if (
        type.name === 'Date' &&
        (typeof value !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(new Date(value).getTime()) ||
          new Date(value).toISOString().slice(0, 10) !== value)
      )
        throw apiError('Invalid date');
      if (type.name === 'BigFloat' || type.name === 'BigInt') {
        if (!Number.isFinite(Number(value))) throw apiError('Invalid number');
        return Number(value);
      }
      return value;
    };
    type.parseValue = coerce;
    type.parseLiteral = (node, variables) =>
      coerce(valueFromASTUntyped(node, variables));
    type.serialize = coerce;
  }
  return schema;
};
