import { type AuthContext } from '@/auth/types/auth-context.type';
import { type CoreStore } from '@/core-db/core-store';
import { apiError, unauthenticated } from '@/shared/errors/api-error.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';

export const loadWorkspaceMetadata = async (
  env: Env,
  store: CoreStore,
  authentication: Promise<AuthContext>,
) => {
  const auth = await authentication;
  if (!(await store.userById(auth.userId))?.isEmailVerified)
    throw apiError(
      'Verify your email address first',
      'FORBIDDEN',
      'EMAIL_NOT_VERIFIED',
    );
  if (!auth.workspaceId || !auth.userWorkspaceId)
    throw unauthenticated('A workspace session is required');
  const workspace = await store.workspaceById(auth.workspaceId);
  const membership = await store.membership(auth.userId, auth.workspaceId);
  if (!workspace || !membership) throw unauthenticated();
  if (workspace.activationStatus !== 'ACTIVE')
    throw apiError('Workspace is not active', 'FORBIDDEN');
  const metadata = await env.WORKSPACE.get(
    env.WORKSPACE.idFromName(workspace.id),
  ).getMetadataReadModel(membership.id);
  if (metadata.permissions.roleIds.length === 0)
    throw apiError('Workspace access denied', 'FORBIDDEN');

  const fields = metadata.tables.fieldMetadata as FieldMetadataRow[];

  return {
    ...metadata,
    workspace,
    membership,
    objectsById: new Map(
      metadata.tables.objectMetadata.map((object) => [object.id, object]),
    ),
    fieldsById: new Map(fields.map((field) => [field.id, field])),
    fieldsByObjectId: Object.groupBy(fields, (field) => field.objectMetadataId),
    indexFieldsByIndexId: Object.groupBy(
      metadata.tables.indexFieldMetadata,
      (field) => field.indexMetadataId,
    ),
  };
};
