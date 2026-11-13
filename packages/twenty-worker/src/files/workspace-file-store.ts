import { isValidUuid } from 'twenty-shared/utils';

import {
  FILE_TRANSFER_LEASE_MS,
  FILE_UPLOAD_EXPIRATION_MS,
  MAX_CORE_PICTURE_BYTES,
  MAX_FILE_UPLOAD_BYTES,
  MAX_SVG_BYTES,
} from '@/files/file.constants';
import { type WorkspaceFile } from '@/files/types/workspace-file.type';
import { apiError } from '@/shared/errors/api-error.util';
import { CUSTOM_APPLICATION_ID } from '@/workspace/metadata/constants/metadata-application-ids.constant';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { metadataWritePermissions } from '@/workspace/metadata/operations/execute-metadata-mutation.util';
import { getWorkspaceApplications } from '@/workspace/metadata/read/workspace-applications.util';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';
import { quoteIdentifier } from '@/workspace/record-api/sql/record-sql.util';

export class WorkspaceFileStore {
  constructor(readonly sql: SqlStorage) {}

  find(id: string) {
    return this.sql
      .exec<WorkspaceFile>('SELECT * FROM "meta_file" WHERE "id" = ?', id)
      .toArray()[0];
  }

  require(id: string) {
    const file = this.find(id);
    if (!file || file.status === 'DELETING')
      throw apiError('File not found', 'NOT_FOUND', 'FILE_NOT_FOUND');
    return file;
  }

  permissions(identity: RecordQueryIdentity) {
    return metadataWritePermissions(
      { sql: this.sql, store: new MetadataStore(this.sql) },
      identity,
    );
  }

  create(
    input: Record<string, unknown>,
    identity: RecordQueryIdentity,
    onboarding = false,
  ) {
    const permissions = onboarding
      ? { permissionFlags: ['UPLOAD_FILE'], objectRecordsPermissions: [] }
      : this.permissions(identity);
    if (onboarding && input.fileFolder !== 'CorePicture')
      throw apiError('Permission denied', 'FORBIDDEN');
    if (!permissions.permissionFlags.includes('UPLOAD_FILE'))
      throw apiError('Permission denied', 'FORBIDDEN');
    const { filename, size, workspaceId } = input;
    const folder =
      input.fileFolder === 'CorePicture'
        ? 'core-picture'
        : input.fileFolder === 'FilesField'
          ? 'files-field'
          : null;
    if (
      !folder ||
      typeof workspaceId !== 'string' ||
      !isValidUuid(workspaceId) ||
      typeof filename !== 'string' ||
      !filename.trim() ||
      filename.length > 255 ||
      /[\\/\x00-\x1f]/.test(filename)
    )
      throw apiError('Invalid file upload');
    const extension =
      filename.split('.').length > 1
        ? filename.split('.').at(-1)!.toLowerCase()
        : '';
    if (extension && !/^[a-z0-9]{1,16}$/.test(extension))
      throw apiError('Invalid file extension');
    if (
      typeof size !== 'number' ||
      !Number.isInteger(size) ||
      size <= 0 ||
      size >
        (folder === 'core-picture'
          ? MAX_CORE_PICTURE_BYTES
          : MAX_FILE_UPLOAD_BYTES) ||
      (extension === 'svg' && size > MAX_SVG_BYTES)
    )
      throw apiError(
        'The file is empty or exceeds the maximum allowed size',
        'BAD_USER_INPUT',
        'FILE_TOO_LARGE',
      );
    const store = new MetadataStore(this.sql);
    const field =
      folder === 'files-field'
        ? store
            .findMany('fieldMetadata')
            .find(
              (field) =>
                (input.fieldMetadataId === undefined ||
                  input.fieldMetadataId === field.id) &&
                (input.fieldMetadataUniversalIdentifier === undefined ||
                  input.fieldMetadataUniversalIdentifier ===
                    field.universalIdentifier) &&
                (input.fieldMetadataId !== undefined ||
                  input.fieldMetadataUniversalIdentifier !== undefined),
            )
        : undefined;
    if (folder === 'files-field') {
      const permission = permissions.objectRecordsPermissions.find(
        (permission) => permission.objectMetadataId === field?.objectMetadataId,
      );
      const object =
        field && store.findById('objectMetadata', field.objectMetadataId);
      if (
        !field ||
        field.type !== 'FILES' ||
        !field.isActive ||
        !object?.isActive
      )
        throw apiError('A Files field is required');
      if (
        !permission?.canUpdateAllRecords ||
        permission.uneditableFields.includes(field.id)
      )
        throw apiError('Permission denied', 'FORBIDDEN');
    }
    const application = getWorkspaceApplications(store).find(
      (application) =>
        application.id === (field?.applicationId ?? CUSTOM_APPLICATION_ID),
    )!;
    const id = crypto.randomUUID();
    const path = `${folder}/${field ? `${field.universalIdentifier}/` : ''}${id}${extension ? `.${extension}` : ''}`;
    const now = new Date().toISOString();
    const file: WorkspaceFile = {
      id,
      workspaceId,
      createdByUserWorkspaceId: identity.userWorkspaceId,
      fieldMetadataId: field?.id ?? null,
      applicationUniversalIdentifier: application.universalIdentifier,
      folder,
      filename,
      path,
      storageKey: `${workspaceId}/${application.universalIdentifier}/${path}`,
      declaredSize: size,
      size,
      mimeType: 'application/octet-stream',
      status: 'PENDING',
      leaseId: null,
      leaseUntil: null,
      expiresAt: Date.now() + FILE_UPLOAD_EXPIRATION_MS,
      createdAt: now,
      updatedAt: now,
    };
    const row = {
      ...file,
      applicationId: field?.applicationId ?? CUSTOM_APPLICATION_ID,
      isStaticAsset: 0,
    };
    const columns = Object.keys(row);
    this.sql.exec(
      `INSERT INTO "meta_file" (${columns.map(quoteIdentifier).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      ...Object.values(row),
    );
    return file;
  }

  claim(
    id: string,
    operation: 'upload' | 'complete',
    identity?: RecordQueryIdentity,
    purpose?: string,
    onboarding = false,
  ) {
    const file = this.require(id);
    if (operation === 'complete') {
      if (!identity) throw apiError('Permission denied', 'FORBIDDEN');
      const permissions = onboarding
        ? { permissionFlags: ['WORKSPACE'] }
        : this.permissions(identity);
      if (onboarding && (purpose !== 'logo' || file.folder !== 'core-picture'))
        throw apiError('Permission denied', 'FORBIDDEN');
      const flag =
        purpose === 'logo'
          ? 'WORKSPACE'
          : purpose === 'avatar'
            ? 'PROFILE_INFORMATION'
            : 'UPLOAD_FILE';
      if (
        !permissions.permissionFlags.includes(flag) ||
        file.createdByUserWorkspaceId !== identity.userWorkspaceId
      )
        throw apiError('Permission denied', 'FORBIDDEN');
      if (
        (file.folder === 'core-picture') !==
        ['logo', 'avatar'].includes(purpose ?? '')
      )
        throw apiError('Use the dedicated picture completion');
      if (file.status === 'UPLOADED') return file;
    }
    if (file.expiresAt <= Date.now())
      throw apiError('Upload expired', 'NOT_FOUND', 'FILE_NOT_FOUND');
    const expected = operation === 'upload' ? 'PENDING' : 'STORED';
    const claimed = operation === 'upload' ? 'UPLOADING' : 'COMPLETING';
    if (
      file.status !== expected &&
      !(file.status === claimed && (file.leaseUntil ?? 0) <= Date.now())
    )
      throw apiError('File is not ready for this operation', 'CONFLICT');
    const leaseId = crypto.randomUUID();
    this.sql.exec(
      'UPDATE "meta_file" SET "status" = ?, "leaseId" = ?, "leaseUntil" = ?, "updatedAt" = ? WHERE "id" = ?',
      claimed,
      leaseId,
      Date.now() + FILE_TRANSFER_LEASE_MS,
      new Date().toISOString(),
      id,
    );
    return this.require(id);
  }

  finish(
    id: string,
    leaseId: string,
    operation: 'upload' | 'complete',
    input: Record<string, unknown>,
    failed = false,
  ) {
    const file = this.require(id);
    if (
      file.leaseId !== leaseId ||
      file.status !== (operation === 'upload' ? 'UPLOADING' : 'COMPLETING')
    )
      throw apiError('File transfer lease lost', 'CONFLICT');
    const status = failed
      ? operation === 'upload'
        ? 'PENDING'
        : 'STORED'
      : operation === 'upload'
        ? 'STORED'
        : 'UPLOADED';
    const size =
      !failed && operation === 'complete' ? Number(input.size) : file.size;
    const mimeType =
      !failed && operation === 'complete'
        ? String(input.mimeType)
        : file.mimeType;
    this.sql.exec(
      'UPDATE "meta_file" SET "status" = ?, "leaseId" = NULL, "leaseUntil" = NULL, "size" = ?, "mimeType" = ?, "updatedAt" = ? WHERE "id" = ?',
      status,
      size,
      mimeType,
      new Date().toISOString(),
      id,
    );
    return this.require(id);
  }

  isReferenced(file: WorkspaceFile) {
    const store = new MetadataStore(this.sql);
    for (const field of store
      .findMany('fieldMetadata')
      .filter((field) => field.type === 'FILES')) {
      const object = store.findById('objectMetadata', field.objectMetadataId);
      if (
        object &&
        this.sql
          .exec(
            `SELECT 1 FROM ${quoteIdentifier(`rec_${object.nameSingular}`)} AS "record", json_each("record".${quoteIdentifier(field.name)}) AS "file" WHERE json_extract("file"."value", '$.fileId') = ? LIMIT 1`,
            file.id,
          )
          .toArray().length
      )
        return true;
    }
    if (
      file.folder === 'core-picture' &&
      this.sql
        .exec(
          'SELECT 1 FROM "rec_workspaceMember" WHERE instr("avatarUrl", ?) > 0 LIMIT 1',
          `/file/core-picture/${file.id}`,
        )
        .toArray().length
    )
      return true;
    return false;
  }
}
