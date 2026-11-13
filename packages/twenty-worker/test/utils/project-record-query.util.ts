import {
  parse,
  print,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  type GraphQLSchema,
} from 'graphql';

import standardMetadata from '@/workspace/seed/standard-metadata.json';
import { createRecordCatalog } from '@/workspace/record-api/record-catalog.util';
import { buildRecordSchema } from '@/workspace/record-api/schema/build-record-schema.util';
import { type MetadataSnapshot } from '@/workspace/metadata/snapshot/build-metadata-snapshot.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type ObjectMetadataRow } from '@/workspace/metadata/types/metadata-row.type';

export const standardRecordSchema = (custom?: {
  object: ObjectMetadataRow;
  fields: FieldMetadataRow[];
}) =>
  buildRecordSchema(
    createRecordCatalog({
      version: 'contract',
      objects: [
        ...standardMetadata.tables.objectMetadata,
        ...(custom ? [custom.object] : []),
      ].map((object) => ({
        ...object,
        fields: [
          ...standardMetadata.tables.fieldMetadata,
          ...(custom?.fields ?? []),
        ].filter((field) => field.objectMetadataId === object.id),
        indexes: [],
        searchFields: [],
      })),
    } as MetadataSnapshot),
  );

// Captures predate the core-only metadata; project the fields the unchanged frontend now requests.
export const projectRecordQuery = (query: string, schema: GraphQLSchema) => {
  const typeInfo = new TypeInfo(schema);
  const document = visit(
    parse(query),
    visitWithTypeInfo(typeInfo, {
      Field: () => (typeInfo.getFieldDef() ? undefined : null),
    }),
  );
  const variables = new Set<string>();
  visit(document, {
    VariableDefinition: () => false,
    Variable: (node) => {
      variables.add(node.name.value);
    },
  });
  return print(
    visit(document, {
      VariableDefinition: (node) =>
        variables.has(node.variable.name.value) ? undefined : null,
    }),
  );
};
