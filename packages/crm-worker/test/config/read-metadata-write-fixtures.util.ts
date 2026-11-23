import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { type MetadataReadTables } from '../../src/workspace/metadata/read/types/metadata-read-model.type';
import { type CreateFieldInput } from '../../src/workspace/metadata/types/field-metadata-inputs.type';

export const readMetadataWriteFixtures = (directory: string) => {
  const tables = (
    JSON.parse(
      readFileSync(
        path.join(directory, '../metadata-export/workspace-metadata.json'),
        'utf8',
      ),
    ) as { tables: MetadataReadTables }
  ).tables;
  const fixtures: {
    path: string;
    query: string;
    variables: Record<string, unknown>;
    data: Record<string, unknown>;
    expectedErrorCode?: string;
    duplicateField?: boolean;
  }[] = [];
  const read = (file: string) =>
    JSON.parse(readFileSync(file, 'utf8')) as {
      endpoint: string;
      query?: string;
      operationName: string;
      variables: Record<string, unknown>;
      response?: {
        data: Record<string, unknown>;
        errors?: { message: string; extensions: { code: string } }[];
      };
      responseRef?: string;
    };
  for (const flow of ['data-model', 'data-model-api', 'cleanup-api', 'views'])
    for (const name of readdirSync(path.join(directory, flow)).filter((name) =>
      /(?:OneFieldMetadataItem|OneObjectMetadataItem|View|NavigationMenuItems)\.json$/.test(
        name,
      ),
    )) {
      const fixture = read(path.join(directory, flow, name));
      if (
        fixture.endpoint !== '/metadata' ||
        !fixture.query?.startsWith('mutation')
      )
        continue;
      const response =
        fixture.response ??
        (fixture.responseRef
          ? read(path.join(directory, fixture.responseRef)).response
          : undefined);
      if (
        response?.errors?.some((error) =>
          error.message.includes('deferred schema action'),
        )
      )
        continue;
      fixtures.push({
        path: `${flow}/${name}`,
        query: fixture.query,
        variables: fixture.variables,
        data: response?.data ?? {},
        expectedErrorCode: response?.errors?.[0]?.extensions.code,
        duplicateField:
          fixture.operationName === 'CreateOneFieldMetadataItem' &&
          response?.errors?.[0]?.extensions.code ===
            'METADATA_VALIDATION_FAILED' &&
          name.startsWith('006-'),
      });
    }
  const fieldDefinitions: CreateFieldInput[] = [];
  for (const flow of readdirSync(directory, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory(),
  ))
    for (const name of readdirSync(path.join(directory, flow.name)).filter(
      (name) => name.endsWith('CreateOneFieldMetadataItem.json'),
    )) {
      const fixture = read(path.join(directory, flow.name, name));
      const field = fixture.response?.data?.createOneField as
        | { id?: string }
        | undefined;
      const input = fixture.variables.input as { field?: CreateFieldInput };
      if (field?.id && input?.field)
        fieldDefinitions.push({ ...input.field, id: field.id });
    }
  return { tables, fixtures, fieldDefinitions };
};
