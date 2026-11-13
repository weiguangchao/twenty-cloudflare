import { type GraphQLFieldResolver } from 'graphql';

import { currentUser } from '@/auth/current-user.service';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import {
  matchesMetadataFilter,
  type MetadataFilter,
} from '@/metadata-api/utils/filter-metadata.util';
import {
  metadataConnection,
  type MetadataPaging,
} from '@/metadata-api/utils/metadata-connection.util';
import { apiError } from '@/shared/errors/api-error.util';
import { type MetadataEntityName } from '@/workspace/metadata/types/metadata-row.type';
import { isVisibleMetadataField } from '@/metadata-api/utils/is-visible-metadata-field.util';
import { isCoreCommandMenuItem } from '@/metadata-api/utils/is-core-command-menu-item.util';

type Resolver = GraphQLFieldResolver<unknown, MetadataContext>;

export const isLiveMetadataRow = (row: object) => {
  const record = row as Record<string, unknown>;
  return (
    (record.deletedAt === null || record.deletedAt === undefined) &&
    record.isActive !== false
  );
};

const byPosition = (left: { position: number }, right: { position: number }) =>
  left.position - right.position;

const requireSetting = async (context: MetadataContext, flag: string) => {
  const data = await context.requireMetadata();
  if (!data.permissions.permissionFlags.includes(flag))
    throw apiError('Permission denied', 'FORBIDDEN', 'PERMISSION_DENIED');
  return data;
};

export const METADATA_QUERY_RESOLVERS: Record<string, Resolver> = {
  objectRecordCounts: async (_source, _arguments, context) => {
    const data = await requireSetting(context, 'DATA_MODEL');
    const auth = await context.requireAuth();
    return context.workspace(data.workspace.id).getObjectRecordCounts({
      userId: auth.userId,
      userWorkspaceId: data.membership.id,
      workspaceMemberId: data.membership.workspaceMemberId,
    });
  },
  mostlyEmptyFieldMetadataIds: async (_source, _arguments, context) => {
    await requireSetting(context, 'DATA_MODEL');
    return [];
  },
  minimalMetadata: async (_source, _arguments, context) => {
    const { tables, collectionHashes } = await context.requireMetadata();
    return {
      objectMetadataItems: tables.objectMetadata,
      views: tables.view.filter(isLiveMetadataRow),
      collectionHashes,
    };
  },
  objects: async (
    _source,
    { paging, filter }: { paging?: MetadataPaging; filter?: MetadataFilter },
    context,
  ) => {
    const { tables } = await context.requireMetadata();
    return metadataConnection(
      tables.objectMetadata
        .filter((object) => matchesMetadataFilter(object, filter))
        .sort((left, right) => left.id.localeCompare(right.id)),
      paging,
    );
  },
  object: async (_source, { id }: { id: string }, context) => {
    const object = (await context.requireMetadata()).objectsById.get(id);
    if (!object) throw apiError('Object not found', 'NOT_FOUND');
    return object;
  },
  fields: async (
    _source,
    { paging, filter }: { paging?: MetadataPaging; filter?: MetadataFilter },
    context,
  ) =>
    metadataConnection(
      [...(await context.requireMetadata()).fieldsById.values()].filter(
        (field) =>
          isVisibleMetadataField(field) && matchesMetadataFilter(field, filter),
      ),
      paging,
    ),
  field: async (_source, { id }: { id: string }, context) => {
    const field = (await context.requireMetadata()).fieldsById.get(id);
    if (!field) throw apiError('Field not found', 'NOT_FOUND');
    return field;
  },
  relatedRecordPaths: async (_source, _arguments, context) =>
    (await context.requireMetadata()).tables.relatedRecordPath,
  getViews: async (
    _source,
    {
      objectMetadataId,
      viewTypes,
    }: { objectMetadataId?: string; viewTypes?: string[] },
    context,
  ) => {
    const { tables } = await context.requireMetadata();
    return tables.view
      .filter(
        (view) =>
          isLiveMetadataRow(view) &&
          (!objectMetadataId || view.objectMetadataId === objectMetadataId) &&
          (!viewTypes || viewTypes.includes(view.type)),
      )
      .sort(byPosition);
  },
  getPageLayouts: async (
    _source,
    {
      objectMetadataId,
      pageLayoutType,
    }: { objectMetadataId?: string; pageLayoutType?: string },
    context,
  ) => {
    const { tables } = await context.requireMetadata();
    return tables.pageLayout.filter(
      (layout) =>
        (!objectMetadataId || layout.objectMetadataId === objectMetadataId) &&
        (!pageLayoutType || layout.type === pageLayoutType),
    );
  },
  navigationMenuItems: async (_source, _arguments, context) => {
    const { tables, membership } = await context.requireMetadata();
    return tables.navigationMenuItem
      .filter(
        (item) =>
          item.userWorkspaceId === null ||
          item.userWorkspaceId === membership.id,
      )
      .sort(byPosition);
  },
  navigationMenuItem: async (_source, { id }: { id: string }, context) => {
    const { tables, membership } = await context.requireMetadata();
    return (
      tables.navigationMenuItem.find(
        (item) =>
          item.id === id &&
          (item.userWorkspaceId === null ||
            item.userWorkspaceId === membership.id),
      ) ?? null
    );
  },
  commandMenuItems: async (_source, _arguments, context) =>
    (await context.requireMetadata()).tables.commandMenuItem
      .filter(isCoreCommandMenuItem)
      .sort(byPosition),
  commandMenuItem: async (_source, { id }: { id: string }, context) =>
    (await context.requireMetadata()).tables.commandMenuItem.find(
      (item) => item.id === id && isCoreCommandMenuItem(item),
    ) ?? null,
  timelineActivityTypes: async (_source, _arguments, context) =>
    (await context.requireMetadata()).tables.timelineActivityType.filter(
      isLiveMetadataRow,
    ),
  findManyApplications: async (_source, _arguments, context) =>
    (await context.requireMetadata()).applications,
  findOneApplication: async (
    _source,
    { id, universalIdentifier }: { id?: string; universalIdentifier?: string },
    context,
  ) => {
    const application = (await context.requireMetadata()).applications.find(
      (candidate) =>
        candidate.id === id ||
        candidate.universalIdentifier === universalIdentifier,
    );
    if (!application) throw apiError('Application not found', 'NOT_FOUND');
    return application;
  },
  currentWorkspace: async (_source, _arguments, context) => {
    await context.requireMetadata();
    return (await currentUser(context)).currentWorkspace;
  },
  getRoles: async (_source, _arguments, context) =>
    (await requireSetting(context, 'ROLES')).tables.role,
  getRole: async (_source, { id }: { id: string }, context) => {
    const role = (await requireSetting(context, 'ROLES')).tables.role.find(
      (candidate) => candidate.id === id,
    );
    if (!role) throw apiError('Role not found', 'NOT_FOUND');
    return role;
  },
  getPermissionFlags: async (_source, _arguments, context) => {
    const { tables, permissions } = await requireSetting(context, 'ROLES');
    return tables.permissionFlag.filter((flag) =>
      permissions.permissionFlags.includes(flag.key),
    );
  },
  findWorkspaceInvitations: async (_source, _arguments, context) => {
    await requireSetting(context, 'WORKSPACE_MEMBERS');
    return [];
  },
  recordPermissions: async (
    _source,
    { targets }: { targets: { objectMetadataId: string; recordId: string }[] },
    context,
  ) => {
    const { permissions } = await context.requireMetadata();
    return targets.map((target) => {
      const object = permissions.objectRecordsPermissions.find(
        (candidate) => candidate.objectMetadataId === target.objectMetadataId,
      );
      return {
        ...target,
        permissions: {
          canRead: object?.canReadAllRecords ?? false,
          canUpdate: object?.canUpdateAllRecords ?? false,
          canDelete: object?.canDestroyAllRecords ?? false,
          canSoftDelete: object?.canSoftDeleteAllRecords ?? false,
        },
      };
    });
  },
};

const VIEW_COLLECTION_QUERIES = {
  getViewFields: ['viewField', 'viewId'],
  getViewFieldGroups: ['viewFieldGroup', 'viewId'],
  getViewFilters: ['viewFilter', 'viewId'],
  getViewFilterGroups: ['viewFilterGroup', 'viewId'],
  getViewSorts: ['viewSort', 'viewId'],
  getViewGroups: ['viewGroup', 'viewId'],
  getPageLayoutTabs: ['pageLayoutTab', 'pageLayoutId'],
  getPageLayoutWidgets: ['pageLayoutWidget', 'pageLayoutTabId'],
} as const;

for (const [queryName, [entityName, parentKey]] of Object.entries(
  VIEW_COLLECTION_QUERIES,
)) {
  METADATA_QUERY_RESOLVERS[queryName] = async (
    _source,
    arguments_,
    context,
  ) => {
    const { tables } = await context.requireMetadata();
    return tables[entityName].filter(
      (row) =>
        isLiveMetadataRow(row) &&
        (!arguments_[parentKey] ||
          (row as Record<string, unknown>)[parentKey] ===
            arguments_[parentKey]),
    );
  };
}

const SINGLE_ENTITY_QUERIES: Record<string, MetadataEntityName> = {
  getView: 'view',
  getViewField: 'viewField',
  getViewFieldGroup: 'viewFieldGroup',
  getViewFilter: 'viewFilter',
  getViewFilterGroup: 'viewFilterGroup',
  getViewSort: 'viewSort',
  getViewGroup: 'viewGroup',
  getPageLayout: 'pageLayout',
  getPageLayoutTab: 'pageLayoutTab',
  getPageLayoutWidget: 'pageLayoutWidget',
};

for (const [queryName, entityName] of Object.entries(SINGLE_ENTITY_QUERIES)) {
  METADATA_QUERY_RESOLVERS[queryName] = async (
    _source,
    { id }: { id: string },
    context,
  ) => {
    const { tables } = await context.requireMetadata();
    const row = tables[entityName].find(
      (candidate) => candidate.id === id && isLiveMetadataRow(candidate),
    );
    if (!row && ['getPageLayoutTab', 'getPageLayoutWidget'].includes(queryName))
      throw apiError('Metadata not found', 'NOT_FOUND');
    return row ?? null;
  };
}

for (const queryName of [
  'findManyLogicFunctions',
  'frontComponents',
  'validationRules',
  'validationRulesReadingField',
  'agentChatChannels',
  'agentChatChannelSummaries',
  'myCalendarChannels',
  'myConnectedAccounts',
  'myMessageChannels',
]) {
  METADATA_QUERY_RESOLVERS[queryName] = async (
    _source,
    _arguments,
    context,
  ) => {
    await context.requireMetadata();
    return [];
  };
}

export const METADATA_MUTATION_RESOLVERS: Record<string, Resolver> = {
  trackAnalytics: () => ({ success: true }),
  addQueryToEventStream: async (_source, _arguments, context) => {
    await context.requireMetadata();
    return true;
  },
  removeQueryFromEventStream: async (_source, _arguments, context) => {
    await context.requireMetadata();
    return true;
  },
};
