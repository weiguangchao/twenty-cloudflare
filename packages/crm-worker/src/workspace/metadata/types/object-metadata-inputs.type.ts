// The GraphQL CreateObjectInput / UpdateObjectPayload fields this backend
// honours.
export type CreateObjectInput = {
  id?: string;
  nameSingular: string;
  namePlural: string;
  labelSingular: string;
  labelPlural: string;
  description?: string | null;
  icon?: string | null;
  shortcut?: string | null;
  color?: string | null;
  skipNameField?: boolean;
  isLabelSyncedWithName?: boolean;
};

export type UpdateObjectInput = {
  labelSingular?: string;
  labelPlural?: string;
  nameSingular?: string;
  namePlural?: string;
  description?: string | null;
  icon?: string | null;
  shortcut?: string | null;
  color?: string | null;
  isActive?: boolean;
  labelIdentifierFieldMetadataId?: string;
  imageIdentifierFieldMetadataId?: string | null;
  isLabelSyncedWithName?: boolean;
  isSearchable?: boolean;
  openRecordIn?: string;
};
