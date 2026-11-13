import { isPlainObject } from 'twenty-shared/utils';

import { createUiMetadataRow } from '@/workspace/metadata/operations/utils/create-ui-metadata-row.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { type ObjectMetadataRow } from '@/workspace/metadata/types/metadata-row.type';

const fieldIsVisible = (field: FieldMetadataRow) =>
  field.isActive &&
  ![
    'id',
    'position',
    'deletedAt',
    'searchVector',
    'updatedAt',
    'updatedBy',
  ].includes(field.name) &&
  !field.isSystemSideEffect;

export const synchronizeObjectUi = (
  { store }: MetadataOperationContext,
  object: ObjectMetadataRow,
) => {
  const fields = store.findMany('fieldMetadata', {
    objectMetadataId: object.id,
  }) as FieldMetadataRow[];
  const eligible = fields.filter(
    (field) =>
      !['TS_VECTOR'].includes(field.type) &&
      (!field.relationTargetObjectMetadataId ||
        field.settings?.relationType === 'MANY_TO_ONE') &&
      (!field.morphId || field.settings?.relationType === 'MANY_TO_ONE'),
  );
  const views = store
    .findMany('view', { objectMetadataId: object.id })
    .filter((view) => view.deletedAt === null);
  for (const view of views) {
    if (view.key !== 'INDEX' && view.type !== 'FIELDS_WIDGET') continue;
    const existing = store.findMany('viewField', { viewId: view.id });
    for (const field of eligible) {
      if (existing.some((entry) => entry.fieldMetadataId === field.id))
        continue;
      const position =
        field.id === object.labelIdentifierFieldMetadataId
          ? 0
          : existing.length + eligible.indexOf(field) + 1;
      store.insert(
        'viewField',
        createUiMetadataRow('viewField', {
          viewId: view.id,
          fieldMetadataId: field.id,
          position,
          size: field.type === 'FULL_NAME' ? 210 : 150,
          isVisible: fieldIsVisible(field),
          isSystemSideEffect: true,
        }),
      );
    }
  }
  for (const layout of store.findMany('pageLayout', {
    objectMetadataId: object.id,
    type: 'RECORD_FORM',
  })) {
    const tab = store.findMany('pageLayoutTab', { pageLayoutId: layout.id })[0];
    if (!tab) continue;
    const widgets = store.findMany('pageLayoutWidget', {
      pageLayoutTabId: tab.id,
    });
    for (const field of eligible.filter(
      (field) => fieldIsVisible(field) && !field.isUIReadOnly,
    )) {
      if (
        widgets.some(
          (widget) =>
            isPlainObject(widget.configuration) &&
            widget.configuration.fieldMetadataId === field.id,
        )
      )
        continue;
      store.insert(
        'pageLayoutWidget',
        createUiMetadataRow('pageLayoutWidget', {
          pageLayoutTabId: tab.id,
          objectMetadataId: object.id,
          type: 'FORM_FIELD',
          title: '',
          configuration: {
            configurationType: 'FORM_FIELD',
            fieldMetadataId: field.id,
          },
          gridPosition: { row: 0, column: 0, rowSpan: 1, columnSpan: 12 },
          position: {
            layoutMode: 'VERTICAL_LIST',
            index:
              field.id === object.labelIdentifierFieldMetadataId
                ? 0
                : widgets.length + eligible.indexOf(field) + 1,
          },
          isSystemSideEffect: true,
        }),
      );
    }
  }
  const fieldIds = new Set(fields.map((field) => field.id));
  store.delete(
    'pageLayoutWidget',
    store
      .findMany('pageLayoutWidget', { objectMetadataId: object.id })
      .filter(
        (widget) =>
          widget.type === 'FORM_FIELD' &&
          isPlainObject(widget.configuration) &&
          !fieldIds.has(String(widget.configuration.fieldMetadataId)),
      )
      .map((widget) => widget.id),
  );
};

export const createObjectUi = (
  context: MetadataOperationContext,
  object: ObjectMetadataRow,
) => {
  const { store } = context;
  const table = createUiMetadataRow('view', {
    name: 'All {objectLabelPlural}',
    objectMetadataId: object.id,
    type: 'TABLE',
    key: 'INDEX',
    icon: 'IconTable',
    openRecordIn: 'SIDE_PANEL',
    visibility: 'WORKSPACE',
    groupLoadLimit: 8,
    isSystemSideEffect: true,
  });
  const details = createUiMetadataRow('view', {
    name: `${object.labelSingular} Record Page Fields`,
    objectMetadataId: object.id,
    type: 'FIELDS_WIDGET',
    icon: 'IconListDetails',
    openRecordIn: 'SIDE_PANEL',
    visibility: 'WORKSPACE',
    groupLoadLimit: 8,
    isSystemSideEffect: true,
  });
  store.insert('view', table);
  store.insert('view', details);
  const page = createUiMetadataRow('pageLayout', {
    name: `Default ${object.labelSingular} Layout`,
    type: 'RECORD_PAGE',
    objectMetadataId: object.id,
    isFirstTabPinned: true,
    isSystemSideEffect: true,
  });
  store.insert('pageLayout', page);
  for (const [index, [title, icon, type]] of [
    ['Home', 'IconHome', 'FIELDS'],
    ['Timeline', 'IconTimelineEvent', 'TIMELINE'],
    ['Tasks', 'IconCheckbox', 'TASKS'],
    ['Notes', 'IconNotes', 'NOTES'],
    ['Files', 'IconFiles', 'FILES'],
  ].entries()) {
    const tab = createUiMetadataRow('pageLayoutTab', {
      pageLayoutId: page.id,
      title,
      icon,
      position: (index + 1) * 10,
      layoutMode: 'VERTICAL_LIST',
      isSystemSideEffect: true,
    });
    store.insert('pageLayoutTab', tab);
    store.insert(
      'pageLayoutWidget',
      createUiMetadataRow('pageLayoutWidget', {
        pageLayoutTabId: tab.id,
        objectMetadataId: object.id,
        title: type === 'FIELDS' ? 'Fields' : title,
        type,
        configuration:
          type === 'FIELDS'
            ? {
                configurationType: 'FIELDS',
                viewId: details.id,
                newFieldDefaultVisibility: true,
              }
            : { configurationType: type },
        gridPosition: { row: 0, column: 0, rowSpan: 1, columnSpan: 12 },
        position: { index: 0, layoutMode: 'VERTICAL_LIST' },
        isSystemSideEffect: true,
      }),
    );
  }
  const form = createUiMetadataRow('pageLayout', {
    name: 'Creation Form',
    type: 'RECORD_FORM',
    objectMetadataId: object.id,
    isFirstTabPinned: true,
    isSystemSideEffect: true,
  });
  store.insert('pageLayout', form);
  store.insert(
    'pageLayoutTab',
    createUiMetadataRow('pageLayoutTab', {
      pageLayoutId: form.id,
      title: 'Fields',
      position: 10,
      icon: 'IconList',
      layoutMode: 'VERTICAL_LIST',
      isSystemSideEffect: true,
    }),
  );
  store.insert(
    'navigationMenuItem',
    createUiMetadataRow('navigationMenuItem', {
      type: 'OBJECT',
      targetObjectMetadataId: object.id,
      color: object.color,
      position:
        Math.max(
          0,
          ...store
            .findMany('navigationMenuItem', {
              userWorkspaceId: null,
              folderId: null,
            })
            .map((item) => item.position),
        ) + 1,
    }),
  );
  synchronizeObjectUi(context, object);
};
