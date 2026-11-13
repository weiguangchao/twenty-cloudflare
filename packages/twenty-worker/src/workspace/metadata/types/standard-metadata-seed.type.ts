// Shape of src/workspace/seed/standard-metadata.json.
export type StandardMetadataSeed = {
  defaultRoleUniversalIdentifier: string | null;
  featureFlags: { key: string; value: boolean }[];
  tables: Partial<Record<string, Record<string, unknown>[]>>;
};
