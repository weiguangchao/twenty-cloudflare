import {
  type AllMetadataName,
  type FailedMetadataValidation,
  type MetadataValidationErrorResponse,
} from 'twenty-shared/metadata';

export type MetadataValidationFailure = FailedMetadataValidation & {
  status: 'fail';
  metadataName: AllMetadataName;
  type: 'create' | 'update' | 'delete';
};

// Mirrors the extensions of the old server's METADATA_VALIDATION_FAILED
// errors so the GraphQL layer can pass it through.
export type MetadataOperationFailure = MetadataValidationErrorResponse & {
  message: string;
  errors: Partial<Record<AllMetadataName, MetadataValidationFailure[]>>;
};

export type MetadataOperationResult<TValue> =
  | { status: 'success'; value: TValue }
  | { status: 'fail'; failure: MetadataOperationFailure };
