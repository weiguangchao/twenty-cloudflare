export type MetadataColumnKind =
  | 'text'
  | 'integer'
  | 'real'
  | 'boolean'
  | 'json';

export type MetadataForeignKeyAction = 'CASCADE' | 'SET_NULL' | 'NO_ACTION';

export type MetadataColumnDefinition = {
  name: string;
  kind: MetadataColumnKind;
  isNullable: boolean;
  references?: {
    entityName: string;
    onDelete: MetadataForeignKeyAction;
  };
};

export type MetadataTableDefinition = {
  entityName: string;
  columns: readonly MetadataColumnDefinition[];
};
