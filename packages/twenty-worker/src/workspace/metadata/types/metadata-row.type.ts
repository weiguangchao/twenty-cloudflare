import { type METADATA_TABLE_DEFINITIONS } from '@/workspace/metadata/constants/metadata-table-definitions.constant';
import { type JsonValue } from '@/workspace/metadata/types/json-value.type';

type MetadataTableDefinitions = typeof METADATA_TABLE_DEFINITIONS;

export type MetadataEntityName = MetadataTableDefinitions[number]['entityName'];

type MetadataColumnsOf<TEntityName extends MetadataEntityName> = Extract<
  MetadataTableDefinitions[number],
  { entityName: TEntityName }
>['columns'][number];

type ColumnKindValue<TKind> = TKind extends 'boolean'
  ? boolean
  : TKind extends 'integer' | 'real'
    ? number
    : TKind extends 'json'
      ? JsonValue
      : string;

type ColumnValue<TColumn> = TColumn extends {
  kind: infer TKind;
  isNullable: infer TIsNullable;
}
  ? ColumnKindValue<TKind> | (TIsNullable extends true ? null : never)
  : never;

export type MetadataRow<TEntityName extends MetadataEntityName> = {
  [
    TColumn in MetadataColumnsOf<TEntityName> as TColumn['name']
  ]: ColumnValue<TColumn>;
};

export type ObjectMetadataRow = MetadataRow<'objectMetadata'>;

export type IndexMetadataRow = MetadataRow<'indexMetadata'>;

export type IndexFieldMetadataRow = MetadataRow<'indexFieldMetadata'>;
