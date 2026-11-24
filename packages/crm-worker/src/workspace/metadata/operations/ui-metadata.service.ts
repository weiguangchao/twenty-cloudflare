import {
  isNativePageKey,
  isPlainObject,
  isSafeUrl,
  isValidUuid,
} from 'crm-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { MetadataValidationException } from '@/workspace/metadata/errors/metadata-validation.exception';
import { createUiMetadataRow } from '@/workspace/metadata/operations/utils/create-ui-metadata-row.util';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { type MetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { metadataValidationError } from '@/workspace/metadata/validation/metadata-validation-error.util';
import { type PermissionContext } from '@/workspace/permissions/types/permission-context.type';
import { quoteIdentifier } from '@/workspace/record-api/sql/record-sql.util';

export type UiMetadataEntity =
  | 'view'
  | 'viewField'
  | 'viewFieldGroup'
  | 'viewFilter'
  | 'viewFilterGroup'
  | 'viewSort'
  | 'viewGroup'
  | 'navigationMenuItem';

export class UiMetadataService {
  constructor(
    readonly context: MetadataOperationContext,
    readonly permissions: PermissionContext,
    readonly operation: 'create' | 'update' | 'delete' = 'create',
  ) {}

  requireFlag(flag: string) {
    if (!this.permissions.permissionFlags.includes(flag))
      throw apiError('Permission denied', 'FORBIDDEN', 'PERMISSION_DENIED');
  }

  invalid(entity: UiMetadataEntity, message: string): never {
    throw MetadataValidationException.single({
      metadataName: entity,
      type: this.operation,
      errors: [
        metadataValidationError(
          `INVALID_${entity.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}_INPUT`,
          message,
        ),
      ],
    });
  }

  find<TEntityName extends UiMetadataEntity>(
    entity: TEntityName,
    id: string,
    includeDeleted = false,
  ) {
    const row = this.context.store.findById(entity, id);
    if (
      !row ||
      (!includeDeleted && 'deletedAt' in row && row.deletedAt !== null)
    )
      throw apiError('Metadata not found', 'NOT_FOUND');
    return row;
  }

  viewAccess(view: MetadataRow<'view'>) {
    if (
      view.visibility !== 'UNLISTED' ||
      view.createdByUserWorkspaceId !== this.permissions.userWorkspaceId
    )
      this.requireFlag('VIEWS');
    const permission = this.permissions.objectRecordsPermissions.find(
      (permission) => permission.objectMetadataId === view.objectMetadataId,
    );
    if (!permission?.canReadAllRecords)
      throw apiError('Permission denied', 'FORBIDDEN');
  }

  checkParent(
    entity: UiMetadataEntity,
    row: Record<string, unknown>,
    includeDeleted = false,
  ) {
    if (entity === 'navigationMenuItem') return this.checkNavigation(row);
    const view =
      entity === 'view'
        ? (row as MetadataRow<'view'>)
        : this.find('view', String(row.viewId), includeDeleted);
    this.viewAccess(view);
    const fieldIds = [
      'fieldMetadataId',
      'mainGroupByFieldMetadataId',
      'calendarFieldMetadataId',
      'calendarEndFieldMetadataId',
      'kanbanAggregateOperationFieldMetadataId',
    ];
    for (const key of fieldIds) {
      if (row[key] === null || row[key] === undefined) continue;
      const field = this.context.store.findById(
        'fieldMetadata',
        String(row[key]),
      );
      if (!field || field.objectMetadataId !== view.objectMetadataId)
        this.invalid(entity, 'Field must belong to the view object');
    }
    for (const [key, parentEntity] of [
      ['viewFieldGroupId', 'viewFieldGroup'],
      ['viewFilterGroupId', 'viewFilterGroup'],
      ['parentViewFilterGroupId', 'viewFilterGroup'],
    ] as const) {
      if (!row[key]) continue;
      const parent = this.find(parentEntity, String(row[key]), includeDeleted);
      if (parent.viewId !== view.id)
        this.invalid(entity, 'Parent must belong to the same view');
    }
    if (entity === 'viewFilterGroup') {
      let id = row.parentViewFilterGroupId;
      const seen = new Set([String(row.id)]);
      while (id) {
        if (seen.has(String(id)))
          this.invalid(entity, 'Filter groups cannot contain cycles');
        seen.add(String(id));
        id = this.find(
          'viewFilterGroup',
          String(id),
          includeDeleted,
        ).parentViewFilterGroupId;
      }
    }
    if (row.relationTargetFieldMetadataId) {
      const relation = this.context.store.findById(
        'fieldMetadata',
        String(row.fieldMetadataId),
      );
      const target = this.context.store.findById(
        'fieldMetadata',
        String(row.relationTargetFieldMetadataId),
      );
      if (
        !relation ||
        !target ||
        relation.relationTargetObjectMetadataId !== target.objectMetadataId
      )
        this.invalid(entity, 'Invalid relation target field');
    }
  }

  checkNavigation(row: Record<string, unknown>) {
    if (row.userWorkspaceId === null) this.requireFlag('WORKSPACE');
    else if (row.userWorkspaceId !== this.permissions.userWorkspaceId)
      throw apiError('Permission denied', 'FORBIDDEN');
    const type = row.type;
    if (
      !['OBJECT', 'RECORD', 'VIEW', 'FOLDER', 'LINK', 'NATIVE_PAGE'].includes(
        String(type),
      )
    )
      this.invalid('navigationMenuItem', 'Unsupported navigation target');
    if (['OBJECT', 'RECORD'].includes(String(type))) {
      const object = this.context.store.findById(
        'objectMetadata',
        String(row.targetObjectMetadataId),
      );
      const permission = this.permissions.objectRecordsPermissions.find(
        (permission) => permission.objectMetadataId === object?.id,
      );
      if (!object?.isActive || !permission?.canReadAllRecords)
        this.invalid('navigationMenuItem', 'Object cannot be accessed');
      if (
        type === 'RECORD' &&
        (typeof row.targetRecordId !== 'string' ||
          !isValidUuid(row.targetRecordId) ||
          !this.context.sql
            .exec(
              `SELECT "id" FROM ${quoteIdentifier(`rec_${object.nameSingular}`)} WHERE "id" = ? AND "deletedAt" IS NULL`,
              row.targetRecordId,
            )
            .toArray().length)
      )
        this.invalid('navigationMenuItem', 'Record not found');
    }
    if (type === 'VIEW') this.viewAccess(this.find('view', String(row.viewId)));
    if (
      type === 'LINK' &&
      (typeof row.link !== 'string' || !isSafeUrl(row.link))
    )
      this.invalid('navigationMenuItem', 'Invalid navigation URL');
    if (type === 'FOLDER' && (typeof row.name !== 'string' || !row.name.trim()))
      this.invalid('navigationMenuItem', 'Folder name is required');
    if (type === 'NATIVE_PAGE' && !isNativePageKey(row.nativePageKey))
      this.invalid('navigationMenuItem', 'Unsupported native page');
    let parentId = row.folderId;
    const seen = new Set([String(row.id)]);
    while (parentId) {
      if (seen.has(String(parentId)))
        this.invalid(
          'navigationMenuItem',
          'Navigation folders cannot contain cycles',
        );
      seen.add(String(parentId));
      const parent = this.find('navigationMenuItem', String(parentId));
      if (
        parent.type !== 'FOLDER' ||
        parent.userWorkspaceId !== row.userWorkspaceId
      )
        this.invalid(
          'navigationMenuItem',
          'Folder must belong to the same navigation owner',
        );
      parentId = parent.folderId;
    }
  }

  create<TEntityName extends UiMetadataEntity>(
    entity: TEntityName,
    input: Record<string, unknown>,
  ): MetadataRow<TEntityName> {
    const row = createUiMetadataRow(entity, {
      ...input,
      ...(entity === 'view'
        ? {
            createdByUserWorkspaceId: this.permissions.userWorkspaceId,
            openRecordIn: input.openRecordIn ?? 'SIDE_PANEL',
            visibility: input.visibility ?? 'WORKSPACE',
            groupLoadLimit: input.groupLoadLimit ?? 8,
          }
        : {}),
      ...(entity === 'viewFilter' ? { operand: input.operand ?? 'IS' } : {}),
    } as Partial<MetadataRow<TEntityName>>);
    this.validate(entity, row);
    this.context.store.insert(entity, row);
    if (entity === 'view') this.createGroups(row as MetadataRow<'view'>);
    return row;
  }

  validate<TEntityName extends UiMetadataEntity>(
    entity: TEntityName,
    row: MetadataRow<TEntityName>,
  ) {
    const values = row as Record<string, unknown>;
    if (typeof values.id !== 'string' || !isValidUuid(values.id))
      this.invalid(entity, 'Invalid metadata ID');
    for (const key of [
      'position',
      'size',
      'positionInViewFilterGroup',
      'kanbanColumnWidth',
      'groupLoadLimit',
    ]) {
      const value = values[key];
      if (
        value !== null &&
        value !== undefined &&
        (typeof value !== 'number' ||
          !Number.isFinite(value) ||
          (key !== 'position' &&
            key !== 'positionInViewFilterGroup' &&
            value < 0))
      )
        this.invalid(entity, `Invalid ${key}`);
    }
    if (
      'name' in values &&
      entity !== 'navigationMenuItem' &&
      (typeof values.name !== 'string' || !values.name.trim())
    )
      this.invalid(entity, 'Name is required');
    if (JSON.stringify(row).length > 2_000_000)
      this.invalid(entity, 'Metadata is too large');
    this.checkParent(entity, values);
    if (
      entity === 'viewField' &&
      this.context.store
        .findMany('viewField', {
          viewId: String(values.viewId),
          fieldMetadataId: String(values.fieldMetadataId),
        })
        .some((field) => field.id !== values.id && field.deletedAt === null)
    )
      this.invalid(entity, 'Field already exists in this view');
  }

  createGroups(view: MetadataRow<'view'>) {
    if (
      !['KANBAN', 'KANBAN_WIDGET'].includes(view.type) ||
      !view.mainGroupByFieldMetadataId
    )
      return;
    const field = this.context.store.findById(
      'fieldMetadata',
      view.mainGroupByFieldMetadataId,
    );
    const options = field?.options;
    const values = Array.isArray(options)
      ? options.flatMap((option) =>
          isPlainObject(option) && typeof option.value === 'string'
            ? [option.value]
            : [],
        )
      : [];
    for (const [position, fieldValue] of [...values, ''].entries())
      this.create('viewGroup', { viewId: view.id, fieldValue, position });
  }

  update<TEntityName extends UiMetadataEntity>(
    entity: TEntityName,
    id: string,
    update: Record<string, unknown>,
  ) {
    const before = this.find(entity, id);
    this.checkParent(entity, before as Record<string, unknown>);
    if (
      'viewId' in update &&
      update.viewId !== (before as Record<string, unknown>).viewId
    )
      this.invalid(entity, 'Cannot move metadata to another view');
    const changes = Object.fromEntries(
      Object.entries(update).filter(
        ([key]) =>
          ![
            'id',
            'universalIdentifier',
            'applicationId',
            'objectMetadataId',
            'viewId',
            'createdByUserWorkspaceId',
            'userWorkspaceId',
            'createdAt',
            'deletedAt',
            'isSystemSideEffect',
          ].includes(key),
      ),
    );
    const after = {
      ...before,
      ...changes,
      updatedAt: new Date().toISOString(),
    } as MetadataRow<TEntityName>;
    this.validate(entity, after);
    this.context.store.update(entity, id, {
      ...changes,
      updatedAt: new Date().toISOString(),
    } as Partial<MetadataRow<TEntityName>>);
    if (
      entity === 'view' &&
      ('mainGroupByFieldMetadataId' in changes || 'type' in changes)
    ) {
      this.context.store.delete(
        'viewGroup',
        this.context.store
          .findMany('viewGroup', { viewId: id })
          .map((group) => group.id),
      );
      this.createGroups(after as MetadataRow<'view'>);
    }
    return after;
  }

  remove<TEntityName extends UiMetadataEntity>(
    entity: TEntityName,
    id: string,
    destroy: boolean,
  ) {
    const row = this.find(entity, id, destroy);
    this.checkParent(entity, row as Record<string, unknown>, destroy);
    if (entity === 'view' && (row as MetadataRow<'view'>).key === 'INDEX')
      this.invalid(entity, 'The default view cannot be deleted');
    if (destroy || entity === 'navigationMenuItem')
      this.context.store.delete(entity, [id]);
    else {
      const deletedAt = new Date().toISOString();
      if (entity === 'view')
        for (const child of [
          'viewField',
          'viewFieldGroup',
          'viewFilter',
          'viewFilterGroup',
          'viewSort',
          'viewGroup',
        ] as const)
          for (const item of this.context.store.findMany(child, { viewId: id }))
            this.context.store.update(child, item.id, {
              deletedAt,
              updatedAt: deletedAt,
            });
      if (entity === 'viewFilterGroup') {
        for (const child of this.context.store
          .findMany('viewFilterGroup', {
            parentViewFilterGroupId: id,
          })
          .filter((child) => child.deletedAt === null))
          this.remove('viewFilterGroup', child.id, false);
        for (const filter of this.context.store.findMany('viewFilter', {
          viewFilterGroupId: id,
        }))
          this.context.store.update('viewFilter', filter.id, {
            deletedAt,
            updatedAt: deletedAt,
          });
      }
      this.context.store.update(entity, id, {
        deletedAt,
        updatedAt: deletedAt,
      } as Partial<MetadataRow<TEntityName>>);
    }
    return this.context.store.findById(entity, id) ?? row;
  }
}
