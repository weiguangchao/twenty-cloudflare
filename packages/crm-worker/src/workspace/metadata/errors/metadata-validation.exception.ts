import {
  type AllMetadataName,
  type FailedMetadataValidationError,
} from 'crm-shared/metadata';

import { type MetadataValidationFailure } from '@/workspace/metadata/types/metadata-operation-result.type';

// Thrown inside a metadata transaction so SQLite rolls everything back;
// runMetadataOperation turns it into a structured failure result.
export class MetadataValidationException extends Error {
  constructor(readonly failures: MetadataValidationFailure[]) {
    super(
      failures
        .flatMap((failure) => failure.errors.map((error) => error.message))
        .join('; '),
    );
  }

  static single({
    metadataName,
    type,
    errors,
    flatEntityMinimalInformation = {},
  }: {
    metadataName: AllMetadataName;
    type: MetadataValidationFailure['type'];
    errors: FailedMetadataValidationError[];
    flatEntityMinimalInformation?: Record<string, unknown>;
  }) {
    return new MetadataValidationException([
      {
        status: 'fail',
        metadataName,
        type,
        errors,
        flatEntityMinimalInformation,
      },
    ]);
  }
}
