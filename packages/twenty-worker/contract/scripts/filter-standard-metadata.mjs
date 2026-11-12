// Trims metadata-export/workspace-metadata.json to the core CRM scope and
// writes src/workspace/seed/standard-metadata.json. Rules and the dangling
// reference check are described in contract/README.md.
// Usage: node filter-standard-metadata.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const INPUT_PATH = join(
  SCRIPT_DIRECTORY,
  '..',
  'metadata-export',
  'workspace-metadata.json',
);
const OUTPUT_PATH = join(
  SCRIPT_DIRECTORY,
  '..',
  '..',
  'src',
  'workspace',
  'seed',
  'standard-metadata.json',
);
const REPORT_PATH = join(
  SCRIPT_DIRECTORY,
  '..',
  'metadata-export',
  'filter-report.json',
);

const CORE_OBJECT_NAMES = new Set([
  'company',
  'person',
  'opportunity',
  'note',
  'noteTarget',
  'task',
  'taskTarget',
  'attachment',
  'timelineActivity',
  'workspaceMember',
]);

const OUT_OF_SCOPE_WIDGET_TYPES = new Set([
  'GRAPH',
  'EMAILS',
  'EMAIL_THREAD',
  'CALENDAR',
  'CHAT',
  'CHAT_THREADS',
  'CALL_RECORDING_SUMMARY',
  'CALL_RECORDING_TRANSCRIPT',
  'WORKFLOW',
  'WORKFLOW_VERSION',
  'WORKFLOW_RUN',
  'MESSAGE_CAMPAIGN_BODY',
  'IFRAME',
]);

const OUT_OF_SCOPE_COMMAND_KEY_PATTERN =
  /WORKFLOW|AI_CHAT|ASK_AI|DASHBOARD|CAMPAIGN|MESSAGE_LIST|EMAIL|SHARE_RECORD/;

const OUT_OF_SCOPE_NATIVE_PAGE_KEYS = new Set(['workflows']);

// Metadata tables that make up the seed. roleTarget, fieldPermission and
// objectPermission only hold rows created for users or test roles.
const SEED_TABLES = [
  'objectMetadata',
  'fieldMetadata',
  'fieldMetadataOption',
  'indexMetadata',
  'indexFieldMetadata',
  'searchFieldMetadata',
  'view',
  'viewField',
  'viewFieldGroup',
  'viewFilter',
  'viewFilterGroup',
  'viewSort',
  'viewGroup',
  'pageLayout',
  'pageLayoutTab',
  'pageLayoutWidget',
  'navigationMenuItem',
  'commandMenuItem',
  'role',
  'permissionFlag',
  'rolePermissionFlag',
  'objectPermission',
  'fieldPermission',
  'timelineActivityType',
  'relatedRecordPath',
];

// Keys whose UUID values point outside the metadata graph.
const NON_REFERENCE_KEYS = new Set([
  'id',
  'universalIdentifier',
  'workspaceId',
  'applicationId',
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STANDARD_UNIVERSAL_IDENTIFIER_PREFIX = '20202020-';

const exportData = JSON.parse(readFileSync(INPUT_PATH, 'utf8'));
const { tables } = exportData;

const standardApplication = tables.application.find(
  (application) => application.name === 'Standard',
);

const rowKey = (table, row) => `${table}:${row.id}`;

const removalReasons = new Map();
const removeRow = (table, row, reason) => {
  const key = rowKey(table, row);

  if (!removalReasons.has(key)) {
    removalReasons.set(key, reason);
  }
};
const isRemoved = (table, row) => removalReasons.has(rowKey(table, row));

const objectsById = new Map(
  tables.objectMetadata.map((object) => [object.id, object]),
);
const isCoreObjectId = (objectMetadataId) =>
  CORE_OBJECT_NAMES.has(objectsById.get(objectMetadataId)?.nameSingular);

for (const table of SEED_TABLES) {
  for (const row of tables[table]) {
    if (table === 'role') {
      if (
        !row.universalIdentifier.startsWith(
          STANDARD_UNIVERSAL_IDENTIFIER_PREFIX,
        )
      ) {
        removeRow(table, row, 'role created after workspace activation');
      }
      continue;
    }
    if (table === 'fieldPermission' || table === 'objectPermission') {
      removeRow(table, row, 'permission row created during capture');
      continue;
    }
    if (
      'applicationId' in row &&
      row.applicationId !== standardApplication.id
    ) {
      removeRow(table, row, 'not owned by the standard application');
      continue;
    }
    if (
      table === 'objectMetadata' &&
      !CORE_OBJECT_NAMES.has(row.nameSingular)
    ) {
      removeRow(table, row, `object ${row.nameSingular} is out of scope`);
    }
    if (
      table === 'fieldMetadata' &&
      row.relationTargetObjectMetadataId &&
      !isCoreObjectId(row.relationTargetObjectMetadataId)
    ) {
      removeRow(table, row, 'relation target object is out of scope');
    }
    if (table === 'pageLayout' && row.type === 'DASHBOARD') {
      removeRow(table, row, 'dashboards are out of scope');
    }
    if (
      table === 'pageLayoutWidget' &&
      OUT_OF_SCOPE_WIDGET_TYPES.has(row.type)
    ) {
      removeRow(table, row, `widget type ${row.type} is out of scope`);
    }
    if (
      table === 'commandMenuItem' &&
      (row.frontComponentId ||
        row.workflowVersionId ||
        row.coreWorkflowVersionId ||
        OUT_OF_SCOPE_COMMAND_KEY_PATTERN.test(row.engineComponentKey ?? ''))
    ) {
      removeRow(
        table,
        row,
        `command ${row.engineComponentKey ?? row.label} is out of scope`,
      );
    }
    if (table === 'navigationMenuItem') {
      if (row.userWorkspaceId) {
        removeRow(table, row, 'user favorite created during capture');
      } else if (OUT_OF_SCOPE_NATIVE_PAGE_KEYS.has(row.nativePageKey)) {
        removeRow(
          table,
          row,
          `native page ${row.nativePageKey} is out of scope`,
        );
      }
    }
  }
}

const collectReferences = (value, parentKey, references) => {
  if (typeof value === 'string') {
    if (UUID_PATTERN.test(value) && !NON_REFERENCE_KEYS.has(parentKey)) {
      references.add(value.toLowerCase());
    }
  } else if (Array.isArray(value)) {
    for (const item of value) collectReferences(item, parentKey, references);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      collectReferences(nested, key, references);
    }
  }
  return references;
};

const referencesByRowKey = new Map();
const rowsByIdentifier = new Map();

for (const table of SEED_TABLES) {
  for (const row of tables[table]) {
    referencesByRowKey.set(
      rowKey(table, row),
      collectReferences(row, null, new Set()),
    );
    for (const identifier of [row.id, row.universalIdentifier]) {
      if (identifier) {
        rowsByIdentifier.set(identifier.toLowerCase(), { table, row });
      }
    }
  }
}

const removedIdentifiers = () => {
  const identifiers = new Set();

  for (const table of SEED_TABLES) {
    for (const row of tables[table]) {
      if (isRemoved(table, row)) {
        identifiers.add(row.id.toLowerCase());
        if (row.universalIdentifier) {
          identifiers.add(row.universalIdentifier.toLowerCase());
        }
      }
    }
  }
  return identifiers;
};

let changed = true;

while (changed) {
  changed = false;
  const removed = removedIdentifiers();

  for (const table of SEED_TABLES) {
    for (const row of tables[table]) {
      if (isRemoved(table, row)) continue;

      for (const reference of referencesByRowKey.get(rowKey(table, row))) {
        if (removed.has(reference)) {
          const target = rowsByIdentifier.get(reference);

          removeRow(
            table,
            row,
            `references removed ${target.table} ${target.row.name ?? target.row.nameSingular ?? target.row.label ?? target.row.id}`,
          );
          changed = true;
          break;
        }
      }
    }
  }

  // An index that lost any of its columns would index something else.
  for (const index of tables.indexMetadata) {
    if (isRemoved('indexMetadata', index)) continue;
    const hasRemovedColumn = tables.indexFieldMetadata.some(
      (indexField) =>
        indexField.indexMetadataId === index.id &&
        isRemoved('indexFieldMetadata', indexField),
    );

    if (hasRemovedColumn) {
      removeRow('indexMetadata', index, 'index column is out of scope');
      changed = true;
    }
  }

  // A folder with no remaining children is dropped with them.
  for (const folder of tables.navigationMenuItem) {
    if (folder.type !== 'FOLDER' || isRemoved('navigationMenuItem', folder)) {
      continue;
    }
    const hasKeptChild = tables.navigationMenuItem.some(
      (item) =>
        item.folderId === folder.id && !isRemoved('navigationMenuItem', item),
    );

    if (!hasKeptChild) {
      removeRow('navigationMenuItem', folder, 'folder has no in-scope items');
      changed = true;
    }
  }

  // Widget views only exist to back a widget; one whose widget was dropped
  // (such as the person table on the list record page) goes with it.
  for (const view of tables.view) {
    if (
      !['FIELDS_WIDGET', 'TABLE_WIDGET'].includes(view.type) ||
      isRemoved('view', view)
    ) {
      continue;
    }
    const isUsedByKeptWidget = tables.pageLayoutWidget.some(
      (widget) =>
        !isRemoved('pageLayoutWidget', widget) &&
        referencesByRowKey
          .get(rowKey('pageLayoutWidget', widget))
          .has(view.id.toLowerCase()),
    );

    if (!isUsedByKeptWidget) {
      removeRow('view', view, 'widget view without an in-scope widget');
      changed = true;
    }
  }

  // A tab with no remaining widgets is dropped too.
  for (const tab of tables.pageLayoutTab) {
    if (isRemoved('pageLayoutTab', tab)) continue;
    const hasKeptWidget = tables.pageLayoutWidget.some(
      (widget) =>
        widget.pageLayoutTabId === tab.id &&
        !isRemoved('pageLayoutWidget', widget),
    );

    if (!hasKeptWidget) {
      removeRow('pageLayoutTab', tab, 'tab has no in-scope widgets');
      changed = true;
    }
  }
}

const keptTables = {};
const keptIdentifiers = new Set();

for (const table of SEED_TABLES) {
  keptTables[table] = tables[table]
    .filter((row) => !isRemoved(table, row))
    .map(({ workspaceId: _workspaceId, ...row }) => row);
  for (const row of keptTables[table]) {
    keptIdentifiers.add(row.id.toLowerCase());
    if (row.universalIdentifier) {
      keptIdentifiers.add(row.universalIdentifier.toLowerCase());
    }
  }
}

const danglingReferences = [];
const externalReferences = [];

for (const table of SEED_TABLES) {
  for (const row of keptTables[table]) {
    for (const reference of collectReferences(row, null, new Set())) {
      if (keptIdentifiers.has(reference)) continue;
      if (rowsByIdentifier.has(reference)) {
        danglingReferences.push({ table, id: row.id, reference });
      } else {
        externalReferences.push({ table, id: row.id, reference });
      }
    }
  }
}

const keptObjectNames = keptTables.objectMetadata
  .map((object) => object.nameSingular)
  .sort();

const removalCounts = {};

for (const [key, reason] of removalReasons) {
  const table = key.split(':')[0];

  removalCounts[table] ??= {};
  removalCounts[table][reason] = (removalCounts[table][reason] ?? 0) + 1;
}

writeFileSync(
  REPORT_PATH,
  JSON.stringify(
    {
      keptCounts: Object.fromEntries(
        SEED_TABLES.map((table) => [table, keptTables[table].length]),
      ),
      removalCounts,
      externalReferences,
      danglingReferences,
    },
    null,
    2,
  ) + '\n',
);

const indexesWithoutColumns = keptTables.indexMetadata.filter(
  (index) =>
    !keptTables.indexFieldMetadata.some(
      (indexField) => indexField.indexMetadataId === index.id,
    ),
);

if (indexesWithoutColumns.length > 0) {
  console.error(
    `indexes without columns: ${indexesWithoutColumns.map((index) => index.name).join(', ')}`,
  );
  process.exit(1);
}
if (danglingReferences.length > 0) {
  console.error(
    `${danglingReferences.length} dangling references, see ${REPORT_PATH}`,
  );
  process.exit(1);
}
if (externalReferences.length > 0) {
  console.error(
    `${externalReferences.length} references to ids outside the export, see ${REPORT_PATH}`,
  );
  process.exit(1);
}
if (
  keptObjectNames.length !== CORE_OBJECT_NAMES.size ||
  keptObjectNames.some((name) => !CORE_OBJECT_NAMES.has(name))
) {
  console.error(`unexpected objects kept: ${keptObjectNames.join(', ')}`);
  process.exit(1);
}

const defaultRole = keptTables.role.find(
  (role) => role.id === exportData.workspace.defaultRoleId,
);

writeFileSync(
  OUTPUT_PATH,
  JSON.stringify(
    {
      source: {
        exportedAt: exportData.exportedAt,
        description:
          'Standard metadata of a freshly activated workspace on twenty-server, trimmed to the core CRM scope by contract/scripts/filter-standard-metadata.mjs',
      },
      defaultRoleUniversalIdentifier: defaultRole?.universalIdentifier ?? null,
      featureFlags: tables.featureFlag.map(({ key, value }) => ({
        key,
        value,
      })),
      applications: tables.application.map(
        ({ id, universalIdentifier, name }) => ({
          id,
          universalIdentifier,
          name,
        }),
      ),
      tables: keptTables,
    },
    null,
    2,
  ) + '\n',
);

console.log(`kept objects: ${keptObjectNames.join(', ')}`);
for (const table of SEED_TABLES) {
  console.log(`${table}: ${keptTables[table].length}`);
}
