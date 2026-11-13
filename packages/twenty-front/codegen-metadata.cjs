module.exports = {
  schema: '../twenty-worker/contract/metadata-schema.graphql',
  documents: [
    './src/modules/auth/graphql/**/*.{ts,tsx}',
    './src/modules/users/graphql/**/*.{ts,tsx}',
    './src/modules/views/graphql/**/*.{ts,tsx}',
    // answerToolCall is served by the core (/graphql) schema via @CoreResolver.
    './src/modules/object-record/record-sharing/graphql/**/*.{ts,tsx}',

    './src/modules/workspace/graphql/**/*.{ts,tsx}',
    './src/modules/workspace-member/graphql/**/*.{ts,tsx}',
    './src/modules/workspace-invitation/graphql/**/*.{ts,tsx}',

    './src/modules/settings/**/graphql/**/*.{ts,tsx}',
    // DPA operations are served by the core (/graphql) schema via @CoreResolver,
    // not the metadata schema, so they must not be validated against /metadata.
    '!./src/modules/settings/legal/**/graphql/**/*.{ts,tsx}',

    './src/modules/analytics/graphql/**/*.{ts,tsx}',
    './src/modules/object-metadata/graphql/**/*.{ts,tsx}',
    './src/modules/validation-rules/graphql/**/*.{ts,tsx}',
    './src/modules/related-record-paths/graphql/**/*.{ts,tsx}',
    './src/modules/navigation-menu-item/**/graphql/**/*.{ts,tsx}',
    './src/modules/command-menu-item/graphql/**/*.{ts,tsx}',
    './src/modules/file/graphql/**/*.{ts,tsx}',
    './src/modules/onboarding/graphql/**/*.{ts,tsx}',

    './src/modules/page-layout/widgets/**/graphql/**/*.{ts,tsx}',
    './src/modules/activities/calendar/graphql/mutations/**/*.{ts,tsx}',
    './src/modules/activities/emails/graphql/mutations/**/*.{ts,tsx}',
    './src/modules/activities/timeline-activities/graphql/**/*.{ts,tsx}',
    './src/modules/activities/emails/graphql/metadata-queries/**/*.{ts,tsx}',

    './src/modules/dashboards/graphql/**/*.{ts,tsx}',
    './src/modules/page-layout/graphql/**/*.{ts,tsx}',
    './src/modules/record-export/graphql/**/*.{ts,tsx}',
    './src/modules/metadata-store/graphql/**/*.{ts,tsx}',
    './src/modules/sse-db-event/graphql/**/*.{ts,tsx}',
    './src/modules/geo-map/graphql-query/*.{ts,tsx}',

    './src/pages/**/graphql/**/*.{ts,tsx}',

    '!./src/**/*.test.{ts,tsx}',
    '!./src/**/*.stories.{ts,tsx}',
    '!./src/**/__mocks__/*.ts',
  ],
  overwrite: true,
  config: {
    useTypeImports: true,
    defaultScalarType: 'any',
    scalars: {
      DateTime: 'string',
      UUID: 'string',
    },
    namingConvention: { enumValues: 'keep' },
    enumType: 'native',
  },
  generates: {
    './src/generated-metadata/schema.ts': {
      plugins: ['typescript'],
    },
    './src/generated-metadata/graphql.ts': {
      plugins: [
        { add: { content: "export * from './schema';" } },
        'typescript-operations',
        'typed-document-node',
      ],
      config: {
        importSchemaTypesFrom: './src/generated-metadata/schema',
        nonOptionalTypename: true,
        skipTypeNameForRoot: true,
      },
    },
  },
};
