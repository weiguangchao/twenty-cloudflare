import { FieldMetadataType } from 'twenty-shared/types';

import { type JsonValue } from '@/workspace/metadata/types/json-value.type';

type CustomObjectSystemField = {
  name: string;
  type: FieldMetadataType;
  label: string;
  icon: string;
  description: string;
  isNullable: boolean;
  defaultValue: JsonValue;
  isSystem: boolean;
  isSystemSideEffect: boolean;
  isUIEditable: boolean;
  isAuditLogged: boolean;
  disabledFieldPermissionActions: string[] | null;
};

const SYSTEM_FIELD_DEFAULTS = {
  isSystem: true,
  isSystemSideEffect: true,
  isUIEditable: false,
  isAuditLogged: true,
  disabledFieldPermissionActions: null,
} as const;

// Fields the old server adds to every custom object.
export const CUSTOM_OBJECT_SYSTEM_FIELDS: CustomObjectSystemField[] = [
  {
    ...SYSTEM_FIELD_DEFAULTS,
    name: 'id',
    type: FieldMetadataType.UUID,
    label: 'ID',
    icon: 'Icon123',
    description: 'ID',
    isNullable: false,
    defaultValue: 'uuid',
  },
  {
    ...SYSTEM_FIELD_DEFAULTS,
    name: 'createdAt',
    type: FieldMetadataType.DATE_TIME,
    label: 'Creation date',
    icon: 'IconCalendar',
    description: 'Creation date',
    isNullable: false,
    defaultValue: 'now',
  },
  {
    ...SYSTEM_FIELD_DEFAULTS,
    name: 'updatedAt',
    type: FieldMetadataType.DATE_TIME,
    label: 'Last update',
    icon: 'IconCalendarClock',
    description: 'Last time the record was changed',
    isNullable: false,
    defaultValue: 'now',
  },
  {
    ...SYSTEM_FIELD_DEFAULTS,
    name: 'deletedAt',
    type: FieldMetadataType.DATE_TIME,
    label: 'Deleted at',
    icon: 'IconCalendarClock',
    description: 'Deletion date',
    isNullable: true,
    defaultValue: null,
  },
  {
    ...SYSTEM_FIELD_DEFAULTS,
    name: 'createdBy',
    type: FieldMetadataType.ACTOR,
    label: 'Created by',
    icon: 'IconCreativeCommonsSa',
    description: 'The creator of the record',
    isNullable: false,
    defaultValue: { name: "''", source: "'MANUAL'" },
  },
  {
    ...SYSTEM_FIELD_DEFAULTS,
    name: 'updatedBy',
    type: FieldMetadataType.ACTOR,
    label: 'Updated by',
    icon: 'IconUserCircle',
    description: 'The workspace member who last updated the record',
    isNullable: false,
    defaultValue: { name: "''", source: "'MANUAL'" },
  },
  {
    ...SYSTEM_FIELD_DEFAULTS,
    name: 'position',
    type: FieldMetadataType.POSITION,
    label: 'Position',
    icon: 'IconHierarchy2',
    description: 'Position',
    isNullable: false,
    defaultValue: 0,
    isAuditLogged: false,
  },
  {
    ...SYSTEM_FIELD_DEFAULTS,
    name: 'searchVector',
    type: FieldMetadataType.TS_VECTOR,
    label: 'Search vector',
    icon: 'IconSearch',
    description: 'Search vector',
    isNullable: true,
    defaultValue: null,
    disabledFieldPermissionActions: ['canUpdateFieldValue'],
  },
];

export const CUSTOM_OBJECT_NAME_FIELD: CustomObjectSystemField = {
  name: 'name',
  type: FieldMetadataType.TEXT,
  label: 'Name',
  icon: 'IconAbc',
  description: 'Name',
  isNullable: true,
  defaultValue: null,
  isSystem: false,
  isSystemSideEffect: false,
  isUIEditable: true,
  isAuditLogged: true,
  disabledFieldPermissionActions: null,
};
