import { FieldMetadataType } from 'crm-shared/types';
import { capitalize } from 'crm-shared/utils';

import {
  CUSTOM_OBJECT_NAME_FIELD,
  CUSTOM_OBJECT_SYSTEM_FIELDS,
} from '@/workspace/metadata/constants/custom-object-system-fields.constant';
import { CUSTOM_OBJECT_RELATION_TARGETS } from '@/workspace/metadata/constants/custom-object-relation-targets.constant';
import { CUSTOM_APPLICATION_ID } from '@/workspace/metadata/constants/metadata-application-ids.constant';
import { createRecordTable } from '@/workspace/metadata/ddl/record-table-ddl.util';
import { MetadataValidationException } from '@/workspace/metadata/errors/metadata-validation.exception';
import {
  buildFieldRow,
  buildIndexRows,
} from '@/workspace/metadata/operations/utils/build-metadata-rows.util';
import {
  buildRelationPair,
  insertFields,
  insertIndex,
} from '@/workspace/metadata/operations/utils/field-schema.util';
import {
  findObjectFields,
  resolveObjectNameSingular,
} from '@/workspace/metadata/operations/utils/metadata-lookups.util';
import { addSearchField } from '@/workspace/metadata/operations/utils/search-field.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { type ObjectMetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { type CreateObjectInput } from '@/workspace/metadata/types/object-metadata-inputs.type';
import {
  validateObjectLabels,
  validateObjectNames,
} from '@/workspace/metadata/validation/validate-object-names.util';

export const computeSystemMorphTargetFieldName = (objectNameSingular: string) =>
  `target${capitalize(objectNameSingular)}`;

// Links the new object to timelineActivity, attachment, noteTarget and
// taskTarget: a ONE_TO_MANY field here, a MORPH_RELATION sibling there that
// joins the target's existing "target" morph group.
const createSystemRelations = (
  context: MetadataOperationContext,
  object: ObjectMetadataRow,
) => {
  for (const relationTarget of CUSTOM_OBJECT_RELATION_TARGETS) {
    const targetObject = context.store.findMany('objectMetadata', {
      nameSingular: relationTarget.objectNameSingular,
    })[0];

    if (targetObject === undefined) continue;

    const morphHead = findObjectFields(context.store, targetObject.id).find(
      (field) =>
        field.type === FieldMetadataType.MORPH_RELATION &&
        field.morphId !== null &&
        field.universalIdentifier === field.morphId,
    );
    const { fields, joinColumnIndex } = buildRelationPair({
      sourceObject: object,
      targetObject,
      relationType: 'ONE_TO_MANY',
      isSystemSideEffect: true,
      sourceField: {
        name: targetObject.namePlural,
        label: relationTarget.forwardLabel,
        icon: relationTarget.forwardIcon,
      },
      targetField: {
        name: computeSystemMorphTargetFieldName(object.nameSingular),
        label: relationTarget.reverseLabel ?? capitalize(object.nameSingular),
        icon: relationTarget.reverseIcon,
        type: FieldMetadataType.MORPH_RELATION,
        morphId: morphHead?.morphId ?? null,
      },
    });

    insertFields(context, fields);
    insertIndex(context, joinColumnIndex);
  }
};

export const createObject = (
  context: MetadataOperationContext,
  input: CreateObjectInput,
): ObjectMetadataRow => {
  const { sql, store } = context;
  const isLabelSyncedWithName = input.isLabelSyncedWithName ?? false;
  const namesAndLabels = {
    nameSingular: input.nameSingular,
    namePlural: input.namePlural,
    labelSingular: input.labelSingular,
    labelPlural: input.labelPlural,
    isLabelSyncedWithName,
  };
  const errors = [
    ...validateObjectNames(store, namesAndLabels),
    ...validateObjectLabels(namesAndLabels),
  ];

  if (errors.length > 0) {
    throw MetadataValidationException.single({
      metadataName: 'objectMetadata',
      type: 'create',
      errors,
      flatEntityMinimalInformation: { nameSingular: input.nameSingular },
    });
  }

  const now = new Date().toISOString();
  const object: ObjectMetadataRow = {
    id: input.id ?? crypto.randomUUID(),
    dataSourceId: null,
    nameSingular: input.nameSingular,
    namePlural: input.namePlural,
    labelSingular: input.labelSingular,
    labelPlural: input.labelPlural,
    description: input.description ?? null,
    icon: input.icon ?? null,
    targetTableName: 'DEPRECATED',
    isRemote: false,
    isActive: true,
    isSystem: false,
    isUIReadOnly: false,
    isAuditLogged: true,
    isSearchable: true,
    duplicateCriteria: null,
    shortcut: input.shortcut ?? null,
    labelIdentifierFieldMetadataId: null,
    imageIdentifierFieldMetadataId: null,
    isLabelSyncedWithName,
    createdAt: now,
    updatedAt: now,
    applicationId: CUSTOM_APPLICATION_ID,
    universalIdentifier: crypto.randomUUID(),
    color: input.color ?? null,
    isUIEditable: true,
    isUICreatable: true,
    overrides: null,
    openRecordIn: 'USER_CHOICE',
    writability: 'OPEN',
    readability: 'OPEN',
    readabilityParentFieldUniversalIdentifiers: null,
    sharingReach: 'WORKSPACE',
    disabledObjectPermissionActions: null,
  };

  store.insert('objectMetadata', object);

  const ownFields: FieldMetadataRow[] = [
    ...CUSTOM_OBJECT_SYSTEM_FIELDS,
    ...(input.skipNameField === true ? [] : [CUSTOM_OBJECT_NAME_FIELD]),
  ].map((template) =>
    buildFieldRow({ ...template, objectMetadataId: object.id }),
  );

  insertFields(context, ownFields, { withColumns: false });
  createRecordTable(
    sql,
    object.nameSingular,
    ownFields,
    resolveObjectNameSingular(store),
  );

  const fieldByName = new Map(ownFields.map((field) => [field.name, field]));
  const labelIdentifierField = fieldByName.get('name') ?? fieldByName.get('id');

  store.update('objectMetadata', object.id, {
    labelIdentifierFieldMetadataId: labelIdentifierField?.id ?? null,
  });

  const nameField = fieldByName.get('name');

  if (nameField !== undefined) addSearchField(context, nameField);

  const searchVectorField = fieldByName.get('searchVector') as FieldMetadataRow;
  const searchIndex = buildIndexRows({
    objectMetadataId: object.id,
    columns: [{ fieldMetadataId: searchVectorField.id }],
    indexType: 'GIN',
  });

  insertIndex(context, searchIndex);
  createSystemRelations(context, object);

  return store.findById('objectMetadata', object.id) as ObjectMetadataRow;
};
