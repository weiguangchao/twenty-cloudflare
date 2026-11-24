module.exports = {
  schema: '../crm-worker/contract/worker-core-schema.graphql',
  documents: [
    './src/modules/command-menu/graphql/**/*.{ts,tsx}',

    '!./src/**/*.test.{ts,tsx}',
    '!./src/**/*.stories.{ts,tsx}',
    '!./src/**/__mocks__/*.ts',
  ],
  ignoreNoDocuments: true,
  overwrite: true,
  config: {
    defaultScalarType: 'any',
    scalars: {
      DateTime: 'string',
      UUID: 'string',
    },
    namingConvention: { enumValues: 'keep' },
    enumType: 'native',
  },
  generates: {
    './src/generated/schema.ts': {
      plugins: ['typescript'],
    },
    './src/generated/graphql.ts': {
      plugins: [
        { add: { content: "export * from './schema';" } },
        'typescript-operations',
        'typed-document-node',
      ],
      config: {
        importSchemaTypesFrom: './src/generated/schema',
        nonOptionalTypename: true,
        skipTypeNameForRoot: true,
      },
    },
  },
};
