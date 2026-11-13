import { defaultFieldResolver, graphqlSync, type GraphQLSchema } from 'graphql';

import { apiError } from '@/shared/errors/api-error.util';
import { findDuplicateRecords } from '@/workspace/record-api/find-duplicate-records.util';
import { groupRecords } from '@/workspace/record-api/group-records.util';
import { parseRecordSelection } from '@/workspace/record-api/parse-record-selection.util';
import { RecordQueryEngine } from '@/workspace/record-api/record-query-engine';
import { selectedRecordFields } from '@/workspace/record-api/record-field-values.util';
import { executeRecordMutation } from '@/workspace/record-api/mutations/execute-record-mutation.util';
import { RecordMutationRollback } from '@/workspace/record-api/mutations/record-mutation-rollback.exception';
import {
  type QueryArguments,
  type RecordQueryContext,
  type RecordQueryInput,
} from '@/workspace/record-api/types/record-query.type';

export const attachRecordResolvers = (schema: GraphQLSchema) => {
  for (const [name, field] of Object.entries(
    schema.getQueryType()!.getFields(),
  )) {
    field.resolve = (
      _source,
      arguments_,
      context: RecordQueryContext,
      info,
    ) => {
      const object = context.catalog.objects.find((candidate) =>
        [
          candidate.namePlural,
          candidate.nameSingular,
          `${candidate.nameSingular}Duplicates`,
          `${candidate.namePlural}GroupBy`,
        ].includes(name),
      );
      if (!object) throw apiError('Unknown record query');
      const engine = new RecordQueryEngine(context);
      const selection = parseRecordSelection(info);
      if (name === object.nameSingular)
        return engine.findOne(object, arguments_ as QueryArguments, selection);
      if (name.endsWith('Duplicates'))
        return findDuplicateRecords(engine, object, arguments_, selection);
      if (name.endsWith('GroupBy'))
        return groupRecords(engine, object, arguments_, selection);
      return engine
        .connections(object, arguments_ as QueryArguments, selection)
        .get('');
    };
  }
  for (const [name, field] of Object.entries(
    schema.getMutationType()!.getFields(),
  ))
    field.resolve = (_source, arguments_, context: RecordQueryContext, info) =>
      executeRecordMutation(
        name,
        arguments_,
        context,
        parseRecordSelection(info),
      );
};

export const executeRecordQuery = (
  input: RecordQueryInput,
  context: RecordQueryContext,
) => {
  const result = graphqlSync({
    schema: context.schema,
    source: input.query,
    variableValues: input.variables,
    operationName: input.operationName,
    contextValue: context,
    fieldResolver: (source, arguments_, resolverContext, info) => {
      const selected = selectedRecordFields(source);
      return selected?.has(String(info.path.key))
        ? selected.get(String(info.path.key))
        : defaultFieldResolver(source, arguments_, resolverContext, info);
    },
  });
  if (result.errors)
    result.errors = result.errors.map((error) => {
      if (error.extensions.code) return error;
      if (!error.path) return apiError(error.message);
      if (
        error.originalError instanceof Error &&
        /constraint failed|SQLITE_CONSTRAINT/i.test(error.originalError.message)
      )
        return apiError(
          /UNIQUE|PRIMARY KEY/i.test(error.originalError.message)
            ? 'A record with this unique value already exists'
            : 'Record violates a relation constraint',
          'CONFLICT',
        );
      console.error('Record query failed', error.originalError);
      return apiError('Unable to load records', 'INTERNAL_SERVER_ERROR');
    });
  const response = JSON.stringify(
    result.errors && context.mutation?.changed
      ? { ...result, data: null }
      : result,
  );
  if (result.errors && context.mutation?.changed)
    throw new RecordMutationRollback(response);
  return response;
};
