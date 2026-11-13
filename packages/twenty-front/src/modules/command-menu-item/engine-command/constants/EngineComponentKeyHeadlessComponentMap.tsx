import { HeadlessNavigateEngineCommand } from '@/command-menu-item/engine-command/components/HeadlessNavigateEngineCommand';
import { HeadlessOpenSidePanelPageEngineCommand } from '@/command-menu-item/engine-command/components/HeadlessOpenSidePanelPageEngineCommand';
import { NavigationEngineCommand } from '@/command-menu-item/engine-command/components/NavigationEngineCommand';
import { EditLayoutCommand } from '@/command-menu-item/engine-command/global/components/EditLayoutCommand';
import { DeleteRecordsCommand } from '@/command-menu-item/engine-command/record/components/DeleteRecordsCommand';
import { DestroyRecordsCommand } from '@/command-menu-item/engine-command/record/components/DestroyRecordsCommand';
import { ExportRecordsCommand } from '@/command-menu-item/engine-command/record/components/ExportRecordsCommand';
import { RestoreRecordsCommand } from '@/command-menu-item/engine-command/record/components/RestoreRecordsCommand';
import { MergeMultipleRecordsCommand } from '@/command-menu-item/engine-command/record/multiple-records/components/MergeMultipleRecordsCommand';
import { UpdateMultipleRecordsCommand } from '@/command-menu-item/engine-command/record/multiple-records/components/UpdateMultipleRecordsCommand';
import { CreateNewRecordCommand } from '@/command-menu-item/engine-command/record/no-selection/components/CreateNewRecordCommand';
import { CreateNewViewNoSelectionRecordCommand } from '@/command-menu-item/engine-command/record/no-selection/components/CreateNewViewNoSelectionRecordCommand';
import { HideDeletedRecordsNoSelectionRecordCommand } from '@/command-menu-item/engine-command/record/no-selection/components/HideDeletedRecordsNoSelectionRecordCommand';
import { ImportRecordsNoSelectionRecordCommand } from '@/command-menu-item/engine-command/record/no-selection/components/ImportRecordsNoSelectionRecordCommand';
import { SeeDeletedRecordsNoSelectionRecordCommand } from '@/command-menu-item/engine-command/record/no-selection/components/SeeDeletedRecordsNoSelectionRecordCommand';
import { AddToFavoritesCommand } from '@/command-menu-item/engine-command/record/components/AddToFavoritesCommand';
import { MergeWithRecordSingleRecordCommand } from '@/command-menu-item/engine-command/record/single-record/components/MergeWithRecordSingleRecordCommand';
import { NavigateToNextRecordSingleRecordCommand } from '@/command-menu-item/engine-command/record/single-record/components/NavigateToNextRecordSingleRecordCommand';
import { NavigateToPreviousRecordSingleRecordCommand } from '@/command-menu-item/engine-command/record/single-record/components/NavigateToPreviousRecordSingleRecordCommand';
import { RemoveFromFavoritesCommand } from '@/command-menu-item/engine-command/record/components/RemoveFromFavoritesCommand';
import { ShareRecordCommand } from '@/command-menu-item/engine-command/record/components/ShareRecordCommand';
import { StandardObjectNamePlural } from '@/object-metadata/types/StandardObjectNamePlural';
import { msg } from '@lingui/core/macro';
import { AppPath, SettingsPath, SidePanelPages } from 'twenty-shared/types';
import { IconSearch } from 'twenty-ui/icon';
import { EngineComponentKey } from '~/generated-metadata/graphql';

export const ENGINE_COMPONENT_KEY_COMPONENT_MAP: Partial<
  Record<EngineComponentKey, React.ReactNode>
> = {
  [EngineComponentKey.CREATE_NEW_RECORD]: <CreateNewRecordCommand />,
  [EngineComponentKey.DELETE_RECORDS]: <DeleteRecordsCommand />,
  [EngineComponentKey.RESTORE_RECORDS]: <RestoreRecordsCommand />,
  [EngineComponentKey.DESTROY_RECORDS]: <DestroyRecordsCommand />,
  [EngineComponentKey.ADD_TO_FAVORITES]: <AddToFavoritesCommand />,
  [EngineComponentKey.REMOVE_FROM_FAVORITES]: <RemoveFromFavoritesCommand />,
  [EngineComponentKey.MERGE_MULTIPLE_RECORDS]: <MergeMultipleRecordsCommand />,
  [EngineComponentKey.MERGE_WITH_RECORD]: (
    <MergeWithRecordSingleRecordCommand />
  ),
  [EngineComponentKey.NAVIGATE_TO_NEXT_RECORD]: (
    <NavigateToNextRecordSingleRecordCommand />
  ),
  [EngineComponentKey.NAVIGATE_TO_PREVIOUS_RECORD]: (
    <NavigateToPreviousRecordSingleRecordCommand />
  ),
  [EngineComponentKey.EXPORT_RECORDS]: <ExportRecordsCommand />,
  [EngineComponentKey.UPDATE_MULTIPLE_RECORDS]: (
    <UpdateMultipleRecordsCommand />
  ),
  [EngineComponentKey.IMPORT_RECORDS]: (
    <ImportRecordsNoSelectionRecordCommand />
  ),
  [EngineComponentKey.EXPORT_VIEW]: <ExportRecordsCommand />,
  [EngineComponentKey.SEE_DELETED_RECORDS]: (
    <SeeDeletedRecordsNoSelectionRecordCommand />
  ),
  [EngineComponentKey.CREATE_NEW_VIEW]: (
    <CreateNewViewNoSelectionRecordCommand />
  ),
  [EngineComponentKey.HIDE_DELETED_RECORDS]: (
    <HideDeletedRecordsNoSelectionRecordCommand />
  ),
  [EngineComponentKey.EDIT_RECORD_PAGE_LAYOUT]: <EditLayoutCommand />,
  [EngineComponentKey.NAVIGATION]: <NavigationEngineCommand />,
  // TODO: remove these keys once `upgrade:1-21:refactor-navigation-commands` has run
  [EngineComponentKey.GO_TO_PEOPLE]: (
    <HeadlessNavigateEngineCommand
      to={AppPath.RecordIndexPage}
      params={{ objectNamePlural: StandardObjectNamePlural.Person }}
    />
  ),
  [EngineComponentKey.GO_TO_COMPANIES]: (
    <HeadlessNavigateEngineCommand
      to={AppPath.RecordIndexPage}
      params={{ objectNamePlural: StandardObjectNamePlural.Company }}
    />
  ),
  [EngineComponentKey.GO_TO_OPPORTUNITIES]: (
    <HeadlessNavigateEngineCommand
      to={AppPath.RecordIndexPage}
      params={{
        objectNamePlural: StandardObjectNamePlural.Opportunity,
      }}
    />
  ),
  [EngineComponentKey.GO_TO_SETTINGS]: (
    <HeadlessNavigateEngineCommand
      to={AppPath.SettingsCatchAll}
      params={{
        '*': SettingsPath.ProfilePage,
      }}
    />
  ),
  [EngineComponentKey.GO_TO_TASKS]: (
    <HeadlessNavigateEngineCommand
      to={AppPath.RecordIndexPage}
      params={{ objectNamePlural: StandardObjectNamePlural.Task }}
    />
  ),
  [EngineComponentKey.GO_TO_NOTES]: (
    <HeadlessNavigateEngineCommand
      to={AppPath.RecordIndexPage}
      params={{ objectNamePlural: StandardObjectNamePlural.Note }}
    />
  ),
  [EngineComponentKey.GO_TO_RUNS]: (
    <HeadlessNavigateEngineCommand
      to={AppPath.RecordIndexPage}
      params={{ objectNamePlural: StandardObjectNamePlural.WorkflowRun }}
    />
  ),
  [EngineComponentKey.SEARCH_RECORDS]: (
    <HeadlessOpenSidePanelPageEngineCommand
      page={SidePanelPages.SearchRecords}
      pageTitle={msg`Search`}
      pageIcon={IconSearch}
      shouldResetSearchState={true}
    />
  ),
  [EngineComponentKey.SEARCH_RECORDS_FALLBACK]: (
    <HeadlessOpenSidePanelPageEngineCommand
      page={SidePanelPages.SearchRecords}
      pageTitle={msg`Search`}
      pageIcon={IconSearch}
    />
  ),
  [EngineComponentKey.SHARE_RECORD]: <ShareRecordCommand />,

  // Deprecated keys kept for backward compatibility until migration runs
  [EngineComponentKey.DELETE_SINGLE_RECORD]: <DeleteRecordsCommand />,
  [EngineComponentKey.DELETE_MULTIPLE_RECORDS]: <DeleteRecordsCommand />,
  [EngineComponentKey.RESTORE_SINGLE_RECORD]: <RestoreRecordsCommand />,
  [EngineComponentKey.RESTORE_MULTIPLE_RECORDS]: <RestoreRecordsCommand />,
  [EngineComponentKey.DESTROY_SINGLE_RECORD]: <DestroyRecordsCommand />,
  [EngineComponentKey.DESTROY_MULTIPLE_RECORDS]: <DestroyRecordsCommand />,
  [EngineComponentKey.EXPORT_FROM_RECORD_INDEX]: <ExportRecordsCommand />,
  [EngineComponentKey.EXPORT_FROM_RECORD_SHOW]: <ExportRecordsCommand />,
  [EngineComponentKey.EXPORT_MULTIPLE_RECORDS]: <ExportRecordsCommand />,
};
