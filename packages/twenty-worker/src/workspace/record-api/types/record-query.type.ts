import { type GraphQLSchema } from 'graphql';
import { type FileUrlContext } from '@/files/types/workspace-file.type';

import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type ObjectMetadataSnapshot } from '@/workspace/metadata/snapshot/build-metadata-snapshot.util';
import { type PermissionContext } from '@/workspace/permissions/types/permission-context.type';

export type RecordQueryInput = {
  requestId?: string;
  fileUrl?: Omit<FileUrlContext, 'secret'>;
  query: string;
  variables?: Record<string, unknown> | null;
  operationName?: string | null;
};

export type RecordQueryIdentity = {
  apiKeyId?: string;
  apiKeyTokenHash?: string;
  userId: string;
  userWorkspaceId: string;
  workspaceMemberId: string;
};

export type RecordSelection = Map<
  string,
  {
    name: string;
    arguments: Record<string, unknown>;
    selection: RecordSelection;
  }
>;

export type RecordData = Record<string, unknown>;
export type QueryArguments = {
  filter?: Record<string, unknown>;
  orderBy?: Record<string, unknown>[];
  first?: number;
  last?: number;
  offset?: number;
  after?: string;
  before?: string;
};

export type RecordObject = ObjectMetadataSnapshot & {
  typeName: string;
  fieldsByName: Map<string, FieldMetadataRow>;
};

export type RecordCatalog = {
  version: string;
  objects: RecordObject[];
  objectsById: Map<string, RecordObject>;
  fieldsById: Map<string, FieldMetadataRow>;
};

export type RecordQueryContext = {
  fileUrl?: FileUrlContext;
  sql: SqlStorage;
  catalog: RecordCatalog;
  schema: GraphQLSchema;
  permissions: PermissionContext;
  mutation?: {
    identity: RecordQueryIdentity;
    actor: RecordData;
    affectedRecords: number;
    changed: boolean;
  };
};

export type OrderLeaf = {
  path: string[];
  expression: string;
  direction: 'ASC' | 'DESC';
  nulls: 'FIRST' | 'LAST';
  values?: string[];
  isArray?: boolean;
  cursorExpression: string;
};
