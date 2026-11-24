import { GraphQLError } from 'graphql';

import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';

export const fileRpc = async <TData>(
  workspace: DurableObjectStub<WorkspaceDurableObject>,
  operation: string,
  input: Record<string, unknown>,
  identity?: RecordQueryIdentity,
): Promise<TData> => {
  const response = JSON.parse(
    await workspace.executeFileOperation(
      operation,
      JSON.stringify(input),
      identity,
    ),
  ) as {
    value: TData;
    error?: { message: string; extensions: Record<string, unknown> };
  };
  if (response.error)
    throw new GraphQLError(response.error.message, {
      extensions: response.error.extensions,
    });
  return response.value;
};
