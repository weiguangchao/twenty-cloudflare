import { MetadataValidationException } from '@/workspace/metadata/errors/metadata-validation.exception';
import { bumpMetadataCollectionHashes } from '@/workspace/metadata/storage/metadata-collection-hashes.util';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import {
  type MetadataOperationFailure,
  type MetadataOperationResult,
} from '@/workspace/metadata/types/metadata-operation-result.type';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';

const toFailure = (
  exception: MetadataValidationException,
): MetadataOperationFailure => {
  const errors: MetadataOperationFailure['errors'] = {};

  for (const failure of exception.failures) {
    (errors[failure.metadataName] ??= []).push(failure);
  }

  const summary: MetadataOperationFailure['summary'] = {
    totalErrors: exception.failures.reduce(
      (total, failure) => total + failure.errors.length,
      0,
    ),
  };

  for (const [metadataName, failures] of Object.entries(errors)) {
    summary[metadataName as keyof typeof errors] = failures?.length ?? 0;
  }

  return { message: exception.message, errors, summary };
};

// Runs a metadata change and its DDL in one transaction: any thrown error
// rolls back both, validation failures come back as a structured result.
export const runMetadataOperation = <TValue>(
  storage: DurableObjectStorage,
  operation: (context: MetadataOperationContext) => TValue,
): MetadataOperationResult<TValue> => {
  try {
    const value = storage.transactionSync(() => {
      const store = new MetadataStore(storage.sql);
      const result = operation({ sql: storage.sql, store });

      bumpMetadataCollectionHashes(storage.sql, store.touchedEntityNames);

      return result;
    });

    return { status: 'success', value };
  } catch (error) {
    if (error instanceof MetadataValidationException) {
      return { status: 'fail', failure: toFailure(error) };
    }
    throw error;
  }
};
