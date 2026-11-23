import { type ContextStoreTargetedRecordsRule } from '@/context-store/states/contextStoreTargetedRecordsRuleComponentState';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import {
  type CommandMenuCoreObjectName,
  type Nullable,
  type RecordGqlOperationFilter,
} from 'crm-shared/types';
import {
  type EngineComponentKey,
  type CommandMenuItemPayload,
} from '~/generated-metadata/graphql';

export type HeadlessEngineCommandContextApi = {
  engineComponentKey: EngineComponentKey;
  contextStoreInstanceId: string;
  objectMetadataItem: Nullable<EnrichedObjectMetadataItem>;
  coreObjectName: CommandMenuCoreObjectName | null;
  currentViewId: Nullable<string>;
  recordIndexId: Nullable<string>;
  hasAnySoftDeleteFilterOnView?: boolean;
  targetedRecordsRule: ContextStoreTargetedRecordsRule;
  selectedRecords: ObjectRecord[];
  graphqlFilter: Nullable<RecordGqlOperationFilter>;
  payload: Nullable<CommandMenuItemPayload>;
  navigationTargetObjectMetadataId: Nullable<string>;
  creationTargetObjectMetadataId?: string;
  isInSidePanel?: boolean;
};

export type HeadlessCommandContextApi = HeadlessEngineCommandContextApi;
