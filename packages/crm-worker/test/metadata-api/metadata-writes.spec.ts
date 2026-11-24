import { SELF } from 'cloudflare:test';
import { beforeAll, expect, it } from 'vitest';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import { createRecordIdentity } from '../utils/record-query-test.util';
import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  prepareWorkspace,
  setupCoreTestDatabase,
  user,
} from '../utils/auth-test.util';

const connection = client();
type Field = { id: string; name: string; type: string; defaultValue: unknown };
type CustomObject = {
  id: string;
  applicationId: string;
  nameSingular: string;
  namePlural: string;
  fieldsList: Field[];
};
let sequence = 0;

const request = async <TData>(
  query: string,
  variables: Record<string, unknown> = {},
) => {
  const { result } = await connection.request<TData>(query, variables);
  expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
  return result.data!;
};
const createObject = async () => {
  const number = ++sequence;
  return (
    await request<{ createOneObject: CustomObject }>(
      'mutation($input: CreateOneObjectInput!) {createOneObject(input: $input) {id applicationId nameSingular namePlural fieldsList {id name type defaultValue}}}',
      {
        input: {
          object: {
            nameSingular: `stageEight${number}`,
            namePlural: `stageEight${number}s`,
            labelSingular: `Stage Eight ${number}`,
            labelPlural: `Stage Eight ${number}s`,
            icon: 'IconTarget',
          },
        },
      },
    )
  ).createOneObject;
};
const createField = async (
  objectMetadataId: string,
  field: Record<string, unknown>,
) =>
  (
    await request<{ createOneField: Field }>(
      'mutation($input: CreateOneFieldMetadataInput!) {createOneField(input: $input) {id name type defaultValue object {id}}}',
      { input: { field: { objectMetadataId, ...field } } },
    )
  ).createOneField;
const createView = async (objectMetadataId: string) =>
  (
    await request<{ createView: { id: string } }>(
      'mutation($input: CreateViewInput!) {createView(input: $input) {id}}',
      { input: { name: 'Test view', icon: 'IconTable', objectMetadataId } },
    )
  ).createView;

beforeAll(async () => {
  await setupCoreTestDatabase();
  await clearCoreTestDatabase();
  await prepareWorkspace(connection);
});

it('creates default views, forms, record layouts and navigation atomically with the object', async () => {
  const object = await createObject();
  expect(object.fieldsList.some((field) => field.name === 'name')).toBe(true);
  const owner = await request<{
    currentUser: {
      currentWorkspace: { workspaceCustomApplication: { id: string } };
    };
  }>('{currentUser {currentWorkspace {workspaceCustomApplication {id}}}}');
  expect(owner.currentUser.currentWorkspace.workspaceCustomApplication.id).toBe(
    object.applicationId,
  );
  const data = await request<{
    getViews: {
      id: string;
      type: string;
      key: string | null;
      viewFields: { fieldMetadataId: string }[];
    }[];
    getPageLayouts: { type: string; tabs: { widgets: { type: string }[] }[] }[];
    navigationMenuItems: { targetObjectMetadataId: string }[];
  }>(
    'query($id: String!) {getViews(objectMetadataId: $id) {id type key viewFields {fieldMetadataId}} getPageLayouts(objectMetadataId: $id) {type tabs {widgets {type}}} navigationMenuItems {targetObjectMetadataId}}',
    { id: object.id },
  );
  expect(data.getViews.map((view) => view.type).sort()).toEqual([
    'FIELDS_WIDGET',
    'TABLE',
  ]);
  expect(
    data.getViews
      .find((view) => view.key === 'INDEX')!
      .viewFields.some(
        (field) =>
          field.fieldMetadataId ===
          object.fieldsList.find((field) => field.name === 'name')!.id,
      ),
  ).toBe(true);
  expect(data.getPageLayouts.map((layout) => layout.type).sort()).toEqual([
    'RECORD_FORM',
    'RECORD_PAGE',
  ]);
  expect(
    data.getPageLayouts.flatMap((layout) =>
      layout.tabs.flatMap((tab) => tab.widgets.map((widget) => widget.type)),
    ),
  ).toEqual(
    expect.arrayContaining([
      'FIELDS',
      'FORM_FIELD',
      'TIMELINE',
      'NOTES',
      'TASKS',
      'FILES',
    ]),
  );
  expect(
    data.navigationMenuItems.some(
      (item) => item.targetObjectMetadataId === object.id,
    ),
  ).toBe(true);
});

it('normalizes field defaults and invalidates record schemas after field renames', async () => {
  const object = await createObject();
  const field = await createField(object.id, {
    name: 'referenceCode',
    label: 'Reference code',
    type: 'TEXT',
    defaultValue: "'Ready'",
  });
  expect(field.defaultValue).toBe('Ready');
  const records = async (
    query: string,
    variables: Record<string, unknown> = {},
  ) => {
    const response = await SELF.fetch(`${ORIGIN}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: ORIGIN,
        cookie: connection.cookie,
        'x-crm-session-cookie': '1',
      },
      body: JSON.stringify({ query, variables }),
    });
    return response.json() as Promise<{
      data: Record<
        string,
        { id: string; referenceCode?: string; newReference?: string }
      >;
      errors?: unknown;
    }>;
  };
  const root = `create${object.nameSingular[0].toUpperCase()}${object.nameSingular.slice(1)}`;
  const created = await records(
    `mutation {${root}(data: {name: "Existing"}) {id referenceCode}}`,
  );
  expect(created.errors).toBeUndefined();
  expect(created.data[root].referenceCode).toBe('Ready');
  await request(
    'mutation($id: UUID!, $update: UpdateFieldInput!) {updateOneField(input: {id: $id, update: $update}) {id}}',
    { id: field.id, update: { name: 'newReference' } },
  );
  const renamed = await records(
    `query($id: UUID!) {${object.nameSingular}(filter: {id: {eq: $id}}) {id newReference}}`,
    { id: created.data[root].id },
  );
  expect(renamed.errors).toBeUndefined();
  expect(renamed.data[object.nameSingular].newReference).toBe('Ready');
  const counts = await request<{
    objectRecordCounts: { objectNamePlural: string; totalCount: number }[];
  }>('{objectRecordCounts {objectNamePlural totalCount}}');
  expect(counts.objectRecordCounts).toContainEqual({
    objectNamePlural: object.namePlural,
    totalCount: 1,
  });
});

it('creates relationship metadata and exposes new fields in forms and view columns', async () => {
  const object = await createObject();
  const { objects } = await request<{
    objects: { edges: { node: { id: string; nameSingular: string } }[] };
  }>('{objects(paging: {first: 100}) {edges {node {id nameSingular}}}}');
  const person = objects.edges.find(
    (edge) => edge.node.nameSingular === 'person',
  )!.node;
  const relation = await createField(object.id, {
    name: 'owner',
    label: 'Owner',
    type: 'RELATION',
    relationCreationPayload: {
      type: 'MANY_TO_ONE',
      targetObjectMetadataId: person.id,
      targetFieldLabel: `${object.namePlural} ownership`,
    },
  });
  const data = await request<{
    getViews: { viewFields: { fieldMetadataId: string }[] }[];
    getPageLayouts: {
      tabs: { widgets: { configuration: { fieldMetadataId?: string } }[] }[];
    }[];
  }>(
    'query($id: String!) {getViews(objectMetadataId: $id) {viewFields {fieldMetadataId}} getPageLayouts(objectMetadataId: $id, pageLayoutType: RECORD_FORM) {tabs {widgets {configuration { ... on FormFieldConfiguration {fieldMetadataId}}}}}}',
    { id: object.id },
  );
  expect(
    data.getViews.every((view) =>
      view.viewFields.some((field) => field.fieldMetadataId === relation.id),
    ),
  ).toBe(true);
  expect(
    data.getPageLayouts
      .flatMap((layout) => layout.tabs.flatMap((tab) => tab.widgets))
      .some((widget) => widget.configuration.fieldMetadataId === relation.id),
  ).toBe(true);
});

it('persists view columns, filters, sorts, groups and field groups with valid parent references', async () => {
  const object = await createObject();
  const view = await createView(object.id);
  const name = object.fieldsList.find((field) => field.name === 'name')!;
  const group = (
    await request<{ createViewFieldGroup: { id: string } }>(
      'mutation($input: CreateViewFieldGroupInput!) {createViewFieldGroup(input: $input) {id}}',
      { input: { name: 'Details', viewId: view.id } },
    )
  ).createViewFieldGroup;
  const field = (
    await request<{ createViewField: { id: string } }>(
      'mutation($input: CreateViewFieldInput!) {createViewField(input: $input) {id}}',
      {
        input: {
          viewId: view.id,
          fieldMetadataId: name.id,
          viewFieldGroupId: group.id,
          size: 180,
        },
      },
    )
  ).createViewField;
  await request(
    'mutation($input: UpdateViewFieldInput!) {updateViewField(input: $input) {id}}',
    {
      input: {
        id: field.id,
        update: { size: 250, position: 2, isVisible: false },
      },
    },
  );
  const filterGroup = (
    await request<{ createViewFilterGroup: { id: string } }>(
      'mutation($input: CreateViewFilterGroupInput!) {createViewFilterGroup(input: $input) {id}}',
      { input: { viewId: view.id, logicalOperator: 'OR' } },
    )
  ).createViewFilterGroup;
  await request(
    'mutation($input: CreateViewFilterInput!) {createViewFilter(input: $input) {id}}',
    {
      input: {
        viewId: view.id,
        fieldMetadataId: name.id,
        operand: 'CONTAINS',
        value: 'San Francisco',
        viewFilterGroupId: filterGroup.id,
      },
    },
  );
  const sort = (
    await request<{ createViewSort: { id: string } }>(
      'mutation($input: CreateViewSortInput!) {createViewSort(input: $input) {id}}',
      {
        input: { viewId: view.id, fieldMetadataId: name.id, direction: 'DESC' },
      },
    )
  ).createViewSort;
  await request(
    'mutation($input: CreateViewGroupInput!) {createViewGroup(input: $input) {id}}',
    { input: { viewId: view.id, fieldValue: 'First', position: 3 } },
  );
  const data = await request<{
    getView: {
      viewFields: unknown[];
      viewFilters: unknown[];
      viewSorts: unknown[];
      viewGroups: unknown[];
    };
  }>(
    'query($id: String!) {getView(id: $id) {viewFields {size position isVisible} viewFilters {value operand} viewSorts {direction} viewGroups {fieldValue position}}}',
    { id: view.id },
  );
  expect(data.getView).toEqual({
    viewFields: [{ size: 250, position: 2, isVisible: false }],
    viewFilters: [{ value: 'San Francisco', operand: 'CONTAINS' }],
    viewSorts: [{ direction: 'DESC' }],
    viewGroups: [{ fieldValue: 'First', position: 3 }],
  });
  await request(
    'mutation($input: DeleteViewSortInput!) {deleteViewSort(input: $input)}',
    { input: { id: sort.id } },
  );
  await request(
    'mutation($input: DestroyViewSortInput!) {destroyViewSort(input: $input)}',
    { input: { id: sort.id } },
  );
});

it('rolls back an entire batch when a child references another object', async () => {
  const object = await createObject();
  const other = await createObject();
  const view = await createView(object.id);
  const name = object.fieldsList.find((field) => field.name === 'name')!;
  const otherName = other.fieldsList.find((field) => field.name === 'name')!;
  const result = await connection.request(
    'mutation($inputs: [CreateViewFieldInput!]!) {createManyViewFields(inputs: $inputs) {id}}',
    {
      inputs: [
        { viewId: view.id, fieldMetadataId: name.id },
        { viewId: view.id, fieldMetadataId: otherName.id },
      ],
    },
  );
  expect(result.result.errors![0].extensions.code).toBe(
    'METADATA_VALIDATION_FAILED',
  );
  expect(
    (
      await request<{ getViewFields: unknown[] }>(
        'query($id: String!) {getViewFields(viewId: $id) {id}}',
        { id: view.id },
      )
    ).getViewFields,
  ).toEqual([]);
});

it('creates and removes favorites with fresh record labels and protects another navigation owner', async () => {
  const current = await user(connection);
  const { objects } = await request<{
    objects: { edges: { node: { id: string; nameSingular: string } }[] };
  }>('{objects(paging: {first: 100}) {edges {node {id nameSingular}}}}');
  const company = objects.edges.find(
    (edge) => edge.node.nameSingular === 'company',
  )!.node;
  const recordResponse = await SELF.fetch(`${ORIGIN}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      cookie: connection.cookie,
      'x-crm-session-cookie': '1',
    },
    body: JSON.stringify({
      query: '{companies(first: 1) {edges {node {id name}}}}',
    }),
  });
  const records = (await recordResponse.json()) as {
    data: { companies: { edges: { node: { id: string; name: string } }[] } };
  };
  const record = records.data.companies.edges[0].node;
  const favorite = (
    await request<{
      createNavigationMenuItem: {
        id: string;
        targetRecordIdentifier: { labelIdentifier: string };
      };
    }>(
      'mutation($input: CreateNavigationMenuItemInput!) {createNavigationMenuItem(input: $input) {id targetRecordIdentifier {id labelIdentifier}}}',
      {
        input: {
          type: 'RECORD',
          targetObjectMetadataId: company.id,
          targetRecordId: record.id,
          userWorkspaceId: current.currentUserWorkspace!.id,
        },
      },
    )
  ).createNavigationMenuItem;
  expect(favorite.targetRecordIdentifier.labelIdentifier).toBe(record.name);
  const refreshed = await request<{
    navigationMenuItem: { targetRecordIdentifier: { labelIdentifier: string } };
  }>(
    'query($id: UUID!) {navigationMenuItem(id: $id) {targetRecordIdentifier {labelIdentifier}}}',
    { id: favorite.id },
  );
  expect(
    refreshed.navigationMenuItem.targetRecordIdentifier.labelIdentifier,
  ).toBe(record.name);
  const denied = await connection.request(
    'mutation($input: CreateNavigationMenuItemInput!) {createNavigationMenuItem(input: $input) {id}}',
    {
      input: {
        type: 'FOLDER',
        name: 'Private',
        userWorkspaceId: crypto.randomUUID(),
      },
    },
  );
  expect(denied.result.errors![0].extensions.code).toBe('FORBIDDEN');
  await request(
    'mutation($ids: [UUID!]!) {deleteManyNavigationMenuItems(ids: $ids) {id}}',
    { ids: [favorite.id] },
  );
  expect(
    (
      await request<{ navigationMenuItem: unknown }>(
        'query($id: UUID!) {navigationMenuItem(id: $id) {id}}',
        { id: favorite.id },
      )
    ).navigationMenuItem,
  ).toBeNull();
});

it('rejects cycles and removes nested filter groups after an earlier child deletion', async () => {
  const object = await createObject();
  const view = await createView(object.id);
  const createGroup = async (parentViewFilterGroupId?: string) =>
    (
      await request<{ createViewFilterGroup: { id: string } }>(
        'mutation($input: CreateViewFilterGroupInput!) {createViewFilterGroup(input: $input) {id}}',
        {
          input: {
            viewId: view.id,
            logicalOperator: 'AND',
            parentViewFilterGroupId,
          },
        },
      )
    ).createViewFilterGroup;
  const parent = await createGroup();
  const child = await createGroup(parent.id);
  const grandchild = await createGroup(child.id);
  const invalid = await connection.request(
    'mutation($id: String!, $input: UpdateViewFilterGroupInput!) {updateViewFilterGroup(id: $id, input: $input) {id}}',
    {
      id: parent.id,
      input: { parentViewFilterGroupId: grandchild.id },
    },
  );
  expect(invalid.result.errors![0].extensions.code).toBe(
    'METADATA_VALIDATION_FAILED',
  );
  expect(invalid.result.errors![0].extensions).toMatchObject({
    errors: { viewFilterGroup: [{ type: 'update' }] },
  });
  await request('mutation($id: String!) {deleteViewFilterGroup(id: $id)}', {
    id: grandchild.id,
  });
  await request('mutation($id: String!) {deleteViewFilterGroup(id: $id)}', {
    id: parent.id,
  });
  expect(
    (
      await request<{ getViewFilterGroups: unknown[] }>(
        'query($id: String!) {getViewFilterGroups(viewId: $id) {id}}',
        { id: view.id },
      )
    ).getViewFilterGroups,
  ).toEqual([]);
  await request('mutation($id: String!) {destroyViewFilterGroup(id: $id)}', {
    id: grandchild.id,
  });
  await request('mutation($id: String!) {destroyViewFilterGroup(id: $id)}', {
    id: parent.id,
  });
});

it('persists navigation order and rejects cyclic folders and invalid native pages', async () => {
  const current = await user(connection);
  const createFolder = async (name: string, folderId?: string) =>
    (
      await request<{ createNavigationMenuItem: { id: string } }>(
        'mutation($input: CreateNavigationMenuItemInput!) {createNavigationMenuItem(input: $input) {id}}',
        {
          input: {
            type: 'FOLDER',
            name,
            folderId,
            userWorkspaceId: current.currentUserWorkspace!.id,
          },
        },
      )
    ).createNavigationMenuItem;
  const parent = await createFolder('Parent');
  const child = await createFolder('Child', parent.id);
  const invalid = await connection.request(
    'mutation($input: UpdateOneNavigationMenuItemInput!) {updateNavigationMenuItem(input: $input) {id}}',
    { input: { id: parent.id, update: { folderId: child.id } } },
  );
  expect(invalid.result.errors![0].extensions.code).toBe(
    'METADATA_VALIDATION_FAILED',
  );
  await request(
    'mutation($inputs: [UpdateOneNavigationMenuItemInput!]!) {updateManyNavigationMenuItems(inputs: $inputs) {id}}',
    {
      inputs: [
        { id: parent.id, update: { position: 42 } },
        { id: child.id, update: { position: 43 } },
      ],
    },
  );
  expect(
    (
      await request<{ navigationMenuItem: { position: number } }>(
        'query($id: UUID!) {navigationMenuItem(id: $id) {position}}',
        { id: parent.id },
      )
    ).navigationMenuItem.position,
  ).toBe(42);
  const nativePage = await request<{
    createNavigationMenuItem: { nativePageKey: string };
  }>(
    'mutation($input: CreateNavigationMenuItemInput!) {createNavigationMenuItem(input: $input) {id nativePageKey}}',
    {
      input: {
        type: 'NATIVE_PAGE',
        nativePageKey: 'workflows',
        userWorkspaceId: current.currentUserWorkspace!.id,
      },
    },
  );
  expect(nativePage.createNavigationMenuItem.nativePageKey).toBe('workflows');
  const invalidPage = await connection.request(
    'mutation($input: CreateNavigationMenuItemInput!) {createNavigationMenuItem(input: $input) {id}}',
    {
      input: {
        type: 'NATIVE_PAGE',
        nativePageKey: 'missing',
        userWorkspaceId: current.currentUserWorkspace!.id,
      },
    },
  );
  expect(invalidPage.result.errors![0].extensions.code).toBe(
    'METADATA_VALIDATION_FAILED',
  );
});

it('rejects anonymous and member data model writes at the DO boundary', async () => {
  const anonymous = await client().request(
    'mutation {createOneObject(input: {object: {nameSingular: "bad", namePlural: "bads", labelSingular: "Bad", labelPlural: "Bads"}}) {id}}',
  );
  expect(anonymous.result.errors![0].extensions.code).toBe('UNAUTHENTICATED');
  await runInNewWorkspace((_, instance) => {
    const identity = createRecordIdentity(instance);
    const result = JSON.parse(
      instance.executeMetadataMutation(
        'createOneObject',
        JSON.stringify({
          input: {
            object: {
              nameSingular: 'bad',
              namePlural: 'bads',
              labelSingular: 'Bad',
              labelPlural: 'Bads',
            },
          },
        }),
        identity,
      ),
    );
    expect(result.errors[0].extensions.code).toBe('FORBIDDEN');
  });
});
