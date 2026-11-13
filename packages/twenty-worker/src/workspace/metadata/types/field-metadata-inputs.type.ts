import { type FieldMetadataType } from 'twenty-shared/types';

import { type JsonValue } from '@/workspace/metadata/types/json-value.type';

import {
  type FieldMetadataOptionInput,
  type FieldMetadataSettings,
  type RelationType,
} from '@/workspace/metadata/types/field-metadata-row.type';

export type RelationCreationPayload = {
  type: RelationType;
  targetObjectMetadataId: string;
  targetFieldLabel: string;
  targetFieldIcon?: string | null;
};

// The GraphQL CreateFieldInput fields this backend honours.
export type CreateFieldInput = {
  id?: string;
  objectMetadataId: string;
  type: FieldMetadataType;
  name: string;
  label: string;
  description?: string | null;
  icon?: string | null;
  isActive?: boolean;
  isNullable?: boolean;
  isUnique?: boolean;
  isSearchable?: boolean;
  isLabelSyncedWithName?: boolean;
  defaultValue?: JsonValue;
  options?: FieldMetadataOptionInput[] | null;
  settings?: FieldMetadataSettings | null;
  relationCreationPayload?: RelationCreationPayload | null;
  morphRelationsCreationPayload?: RelationCreationPayload[] | null;
};

export type UpdateFieldInput = Partial<
  Pick<
    CreateFieldInput,
    | 'name'
    | 'label'
    | 'description'
    | 'icon'
    | 'isActive'
    | 'isNullable'
    | 'isUnique'
    | 'isSearchable'
    | 'isLabelSyncedWithName'
    | 'defaultValue'
    | 'options'
    | 'settings'
  >
> & { isAuditLogged?: boolean };
