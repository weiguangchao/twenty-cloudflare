import { type GraphQLFieldResolver } from 'graphql';
import { roleApiKeys } from '@/metadata-api/integration.resolvers';
import { isDefined } from 'crm-shared/utils';

import { isLiveMetadataRow } from '@/metadata-api/metadata-read.resolvers';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import {
  matchesMetadataFilter,
  type MetadataFilter,
} from '@/metadata-api/utils/filter-metadata.util';
import {
  metadataConnection,
  type MetadataPaging,
} from '@/metadata-api/utils/metadata-connection.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type MetadataEntityName } from '@/workspace/metadata/types/metadata-row.type';
import { isVisibleMetadataField } from '@/metadata-api/utils/is-visible-metadata-field.util';
import { isCoreCommandMenuItem } from '@/metadata-api/utils/is-core-command-menu-item.util';

type Resolver = GraphQLFieldResolver<Record<string, unknown>, MetadataContext>;
type WorkspaceMetadata = Awaited<
  ReturnType<MetadataContext['requireMetadata']>
>;

const relation = (field: FieldMetadataRow, data: WorkspaceMetadata) => {
  let targetField = field.relationTargetFieldMetadataId
    ? data.fieldsById.get(field.relationTargetFieldMetadataId)
    : undefined;
  if (field.type === 'RELATION' && targetField?.type === 'MORPH_RELATION') {
    const morphId = targetField.morphId;
    targetField = (
      data.fieldsByObjectId[targetField.objectMetadataId] ?? []
    ).find((candidate) => candidate.universalIdentifier === morphId);
  }
  const targetObject = field.relationTargetObjectMetadataId
    ? data.objectsById.get(field.relationTargetObjectMetadataId)
    : undefined;
  const sourceObject = data.objectsById.get(field.objectMetadataId);
  if (
    !targetField ||
    !targetObject ||
    !sourceObject ||
    !field.settings?.relationType
  )
    return null;
  return {
    type: field.settings.relationType,
    sourceObjectMetadata: sourceObject,
    targetObjectMetadata: targetObject,
    sourceFieldMetadata: field,
    targetFieldMetadata: targetField,
  };
};

const fieldsForObject = async (
  source: Record<string, unknown>,
  context: MetadataContext,
) =>
  (
    (await context.requireMetadata()).fieldsByObjectId[String(source.id)] ?? []
  ).filter(isVisibleMetadataField);

export const METADATA_FIELD_RESOLVERS: Record<
  string,
  Record<string, Resolver>
> = {
  Object: {
    color: (source) => source.color ?? '',
    fieldsList: (source, _arguments, context) =>
      fieldsForObject(source, context),
    fields: async (
      source,
      { paging, filter }: { paging?: MetadataPaging; filter?: MetadataFilter },
      context,
    ) =>
      metadataConnection(
        (await fieldsForObject(source, context)).filter((field) =>
          matchesMetadataFilter(field, filter),
        ),
        paging,
      ),
    indexMetadataList: async (source, _arguments, context) =>
      (await context.requireMetadata()).tables.indexMetadata.filter(
        (index) => index.objectMetadataId === source.id,
      ),
    indexMetadatas: async (
      source,
      { paging, filter }: { paging?: MetadataPaging; filter?: MetadataFilter },
      context,
    ) =>
      metadataConnection(
        (await context.requireMetadata()).tables.indexMetadata.filter(
          (index) =>
            index.objectMetadataId === source.id &&
            matchesMetadataFilter(index, filter),
        ),
        paging,
      ),
    searchFieldMetadataList: async (source, _arguments, context) =>
      (await context.requireMetadata()).tables.searchFieldMetadata
        .filter((field) => field.objectMetadataId === source.id)
        .sort((left, right) => left.position - right.position),
  },
  Field: {
    object: async (source, _arguments, context) =>
      (await context.requireMetadata()).objectsById.get(
        String(source.objectMetadataId),
      ) ?? null,
    isUnique: async (source, _arguments, context) => {
      const { tables, indexFieldsByIndexId } = await context.requireMetadata();
      return tables.indexMetadata.some(
        (index) =>
          index.objectMetadataId === source.objectMetadataId &&
          index.isUnique &&
          indexFieldsByIndexId[index.id]?.length === 1 &&
          indexFieldsByIndexId[index.id]?.[0].fieldMetadataId === source.id,
      );
    },
    isSearchable: async (source, _arguments, context) =>
      (await context.requireMetadata()).tables.searchFieldMetadata.some(
        (field) => field.fieldMetadataId === source.id,
      ),
    relation: async (source, _arguments, context) => {
      const data = await context.requireMetadata();
      const field = data.fieldsById.get(String(source.id));
      return field?.type === 'RELATION' ? relation(field, data) : null;
    },
    morphRelations: async (source, _arguments, context) => {
      const data = await context.requireMetadata();
      const field = data.fieldsById.get(String(source.id));
      if (!field || field.type !== 'MORPH_RELATION') return null;
      const relations = (
        data.fieldsByObjectId[field.objectMetadataId] ?? []
      ).filter((candidate) => candidate.morphId === field.morphId);
      const head = relations.find(isVisibleMetadataField);
      return relations
        .map((candidate) =>
          relation({ ...candidate, name: head?.name ?? candidate.name }, data),
        )
        .filter(isDefined);
    },
  },
  Index: {
    indexFieldMetadataList: async (source, _arguments, context) =>
      [
        ...((await context.requireMetadata()).indexFieldsByIndexId[
          String(source.id)
        ] ?? []),
      ].sort((left, right) => left.order - right.order),
    isCustom: (source) => source.isSystemSideEffect === false,
  },
  View: {
    workspaceId: async (_source, _arguments, context) =>
      (await context.requireMetadata()).workspace.id,
    isCustom: (source) => source.isSystemSideEffect === false,
  },
  NavigationMenuItem: {
    targetRecordIdentifier: async (source, _arguments, context) =>
      (await context.requireNavigationIdentifiers()).get(String(source.id)) ??
      null,
  },
  Application: {
    objects: async (source, _arguments, context) =>
      (await context.requireMetadata()).tables.objectMetadata.filter(
        (object) => object.applicationId === source.id,
      ),
    commandMenuItems: async (source, _arguments, context) =>
      (await context.requireMetadata()).tables.commandMenuItem.filter(
        (item) =>
          item.applicationId === source.id && isCoreCommandMenuItem(item),
      ),
  },
  Role: {
    apiKeys: (source, _arguments, context) => roleApiKeys(context, source.id),
    workspaceMembers: async (source, _arguments, context) => {
      const data = await context.requireMetadata();
      const memberships = await context.store.membershipsForWorkspace(
        data.workspace.id,
      );
      const assigned = new Set(
        data.tables.roleTarget
          .filter((target) => target.roleId === source.id)
          .map((target) => target.userWorkspaceId),
      );
      return context.workspace(data.workspace.id).getWorkspaceMembers(
        memberships
          .filter((member) => assigned.has(member.id))
          .map((member) => ({
            workspaceMemberId: member.workspaceMemberId,
            userWorkspaceId: member.id,
          })),
      );
    },
    permissionFlags: async (source, _arguments, context) => {
      const { tables } = await context.requireMetadata();
      const permissionFlagById = new Map(
        tables.permissionFlag.map((flag) => [flag.id, flag]),
      );
      return tables.rolePermissionFlag
        .filter((grant) => grant.roleId === source.id)
        .flatMap((grant) => {
          const flag = permissionFlagById.get(grant.permissionFlagId);
          return flag
            ? [{ id: grant.id, roleId: grant.roleId, flag: flag.key }]
            : [];
        });
    },
  },
};

const NESTED_COLLECTIONS: [string, string, MetadataEntityName, string][] = [
  ['Role', 'objectPermissions', 'objectPermission', 'roleId'],
  ['Role', 'fieldPermissions', 'fieldPermission', 'roleId'],
  ['View', 'viewFields', 'viewField', 'viewId'],
  ['View', 'viewFieldGroups', 'viewFieldGroup', 'viewId'],
  ['View', 'viewFilters', 'viewFilter', 'viewId'],
  ['View', 'viewFilterGroups', 'viewFilterGroup', 'viewId'],
  ['View', 'viewSorts', 'viewSort', 'viewId'],
  ['View', 'viewGroups', 'viewGroup', 'viewId'],
  ['ViewFieldGroup', 'viewFields', 'viewField', 'viewFieldGroupId'],
  ['PageLayout', 'tabs', 'pageLayoutTab', 'pageLayoutId'],
  ['PageLayoutTab', 'widgets', 'pageLayoutWidget', 'pageLayoutTabId'],
];

for (const [typeName, fieldName, entityName, parentKey] of NESTED_COLLECTIONS) {
  (METADATA_FIELD_RESOLVERS[typeName] ??= {})[fieldName] = async (
    source,
    _arguments,
    context,
  ) => {
    const { tables } = await context.requireMetadata();
    return tables[entityName]
      .filter(
        (row) =>
          isLiveMetadataRow(row) &&
          (row as Record<string, unknown>)[parentKey] === source.id,
      )
      .sort(
        (left, right) =>
          Number((left as Record<string, unknown>).position ?? 0) -
          Number((right as Record<string, unknown>).position ?? 0),
      );
  };
}
