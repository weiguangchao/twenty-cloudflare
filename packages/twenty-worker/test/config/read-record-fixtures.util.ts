import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import standardMetadata from '../../src/workspace/seed/standard-metadata.json';
import { type FieldMetadataRow } from '../../src/workspace/metadata/types/field-metadata-row.type';
import { type ObjectMetadataRow } from '../../src/workspace/metadata/types/metadata-row.type';

export type ReadRecordFixture = {
  path: string;
  query: string;
  variables: Record<string, unknown>;
  data: unknown;
};
export type CapturedRecord = {
  objectName: string;
  values: Record<string, unknown>;
};

export const readRecordFixtures = (directory: string) => {
  const exported = JSON.parse(
    readFileSync(
      path.join(directory, '../metadata-export/workspace-metadata.json'),
      'utf8',
    ),
  ) as {
    tables: {
      objectMetadata: ObjectMetadataRow[];
      fieldMetadata: FieldMetadataRow[];
    };
  };
  const customObject = exported.tables.objectMetadata.find(
    (object) => object.nameSingular === 'initiative',
  )!;
  const includedIds = new Set([
    ...standardMetadata.tables.objectMetadata.map((object) => object.id),
    customObject.id,
  ]);
  const customFields = exported.tables.fieldMetadata.filter(
    (field) =>
      (field.objectMetadataId === customObject.id ||
        field.relationTargetObjectMetadataId === customObject.id) &&
      includedIds.has(field.objectMetadataId) &&
      (!field.relationTargetObjectMetadataId ||
        includedIds.has(field.relationTargetObjectMetadataId)),
  );
  const fixtures: ReadRecordFixture[] = [];
  const records = new Map<string, CapturedRecord>();
  const objects = new Map(
    [...standardMetadata.tables.objectMetadata, customObject].map((object) => [
      object.nameSingular[0].toUpperCase() + object.nameSingular.slice(1),
      object,
    ]),
  );
  objects.set('Project', customObject);
  const read = (file: string): Record<string, unknown> =>
    JSON.parse(readFileSync(file, 'utf8'));
  const collect = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    const record = value as Record<string, unknown>;
    const object = objects.get(String(record.__typename));
    if (object && typeof record.id === 'string') {
      const fields = [
        ...standardMetadata.tables.fieldMetadata,
        ...customFields,
      ].filter((field) => field.objectMetadataId === object.id);
      const columnNames = new Set(
        fields.map((field) =>
          field.settings?.relationType === 'MANY_TO_ONE'
            ? (field.settings.joinColumnName ?? `${field.name}Id`)
            : field.name,
        ),
      );
      const previous = records.get(record.id)?.values ?? {};
      records.set(record.id, {
        objectName: object.nameSingular,
        values: {
          ...previous,
          ...Object.fromEntries(
            Object.entries(record).filter(([name]) => columnNames.has(name)),
          ),
        },
      });
    }
    Object.values(record).forEach(collect);
  };
  for (const flow of readdirSync(directory, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory(),
  ))
    for (const name of readdirSync(path.join(directory, flow.name)).filter(
      (name) => name.endsWith('.json'),
    )) {
      const fixture = read(path.join(directory, flow.name, name));
      if (
        fixture.endpoint !== '/graphql' ||
        typeof fixture.query !== 'string' ||
        !fixture.query.trim().startsWith('query') ||
        fixture.operationName === 'Search'
      )
        continue;
      const response = (fixture.response ??
        (typeof fixture.responseRef === 'string'
          ? read(path.join(directory, fixture.responseRef)).response
          : undefined)) as { data?: unknown; errors?: unknown } | undefined;
      if (response?.errors) continue;
      collect(response?.data);
      fixtures.push({
        path: `${flow.name}/${name}`,
        query: fixture.query,
        variables: (fixture.variables ?? {}) as Record<string, unknown>,
        data: response?.data,
      });
    }
  return {
    fixtures,
    records: [...records.values()],
    customObject,
    customFields,
  };
};
