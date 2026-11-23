import { isPlainObject } from 'crm-shared/utils';
import { projectFileValues } from '@/files/project-file-values.util';
import { type FileUrlContext } from '@/files/types/workspace-file.type';

import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { type PermissionContext } from '@/workspace/permissions/types/permission-context.type';
import { quoteIdentifier } from '@/workspace/record-api/sql/record-sql.util';

export const navigationRecordIdentifiers = (
  context: MetadataOperationContext,
  permissions: PermissionContext,
  fileUrl?: FileUrlContext,
) => {
  const objects = context.store.findMany('objectMetadata');
  const fields = context.store.findMany('fieldMetadata');
  return context.store
    .findMany('navigationMenuItem')
    .filter(
      (item) =>
        item.type === 'RECORD' &&
        (item.userWorkspaceId === null ||
          item.userWorkspaceId === permissions.userWorkspaceId),
    )
    .flatMap((item) => {
      const object = objects.find(
        (object) =>
          object.id === item.targetObjectMetadataId && object.isActive,
      );
      if (!object) return [];
      const permission = permissions.objectRecordsPermissions.find(
        (permission) => permission.objectMetadataId === object.id,
      );
      const label = fields.find(
        (field) => field.id === object.labelIdentifierFieldMetadataId,
      );
      if (
        !permission?.canReadAllRecords ||
        !label ||
        permission.unreadableFields.includes(label.id)
      )
        return [];
      const image = fields.find(
        (field) =>
          field.id === object.imageIdentifierFieldMetadataId &&
          !permission.unreadableFields.includes(field.id),
      );
      const row = context.sql
        .exec<Record<string, SqlStorageValue>>(
          `SELECT ${quoteIdentifier(label.name)} AS "label", ${image ? quoteIdentifier(image.name) : "''"} AS "image" FROM ${quoteIdentifier(`rec_${object.nameSingular}`)} WHERE "id" = ? AND "deletedAt" IS NULL`,
          item.targetRecordId,
        )
        .toArray()[0];
      if (!row) return [];
      const name: unknown =
        label.type === 'FULL_NAME' && typeof row.label === 'string'
          ? JSON.parse(row.label)
          : row.label;
      const imageValue: unknown =
        image?.type === 'FILES' && typeof row.image === 'string'
          ? JSON.parse(row.image)
          : row.image;
      return [
        {
          navigationMenuItemId: item.id,
          identifier: {
            id: String(item.targetRecordId),
            labelIdentifier: isPlainObject(name)
              ? [name.firstName, name.lastName].filter(Boolean).join(' ')
              : String(name ?? ''),
            imageIdentifier:
              image?.type === 'FILES'
                ? ((
                    projectFileValues(context.sql, imageValue, fileUrl) as
                      | { url?: string }[]
                      | null
                  )?.[0]?.url ?? '')
                : image?.type === 'TEXT'
                  ? String(imageValue ?? '')
                  : '',
          },
        },
      ];
    });
};
