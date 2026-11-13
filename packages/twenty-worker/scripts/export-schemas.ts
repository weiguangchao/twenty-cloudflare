import { writeFileSync } from 'node:fs';
import { printSchema } from 'graphql';

import { createRecordCatalog } from '@/workspace/record-api/record-catalog.util';
import { buildRecordSchema } from '@/workspace/record-api/schema/build-record-schema.util';
import { type MetadataSnapshot } from '@/workspace/metadata/snapshot/build-metadata-snapshot.util';
import standardMetadata from '@/workspace/seed/standard-metadata.json';

const tables = standardMetadata.tables;
const snapshot = {
  version: 'standard',
  objects: tables.objectMetadata.map((object) => ({
    ...object,
    fields: tables.fieldMetadata.filter(
      (field) => field.objectMetadataId === object.id,
    ),
    indexes: tables.indexMetadata
      .filter((index) => index.objectMetadataId === object.id)
      .map((index) => ({
        ...index,
        indexFields: tables.indexFieldMetadata
          .filter((field) => field.indexMetadataId === index.id)
          .sort((left, right) => left.order - right.order),
      })),
    searchFields: tables.searchFieldMetadata.filter(
      (field) => field.objectMetadataId === object.id,
    ),
  })),
} as unknown as MetadataSnapshot;

writeFileSync(
  'contract/worker-core-schema.graphql',
  `${printSchema(buildRecordSchema(createRecordCatalog(snapshot)))}\n`,
);
