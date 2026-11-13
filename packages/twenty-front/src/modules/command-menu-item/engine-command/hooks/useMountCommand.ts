import { useCallback } from 'react';
import { headlessCommandContextApisState } from '@/command-menu-item/engine-command/states/headlessCommandContextApisState';
import { buildHeadlessCommandContextApi } from '@/command-menu-item/engine-command/utils/buildHeadlessCommandContextApi';
import { useStore } from 'jotai';
import {
  type CommandMenuItemAvailabilityType,
  type EngineComponentKey,
  type CommandMenuItemPayload,
} from '~/generated-metadata/graphql';

type MountCommandParams = {
  engineCommandId: string;
  contextStoreInstanceId: string;
  engineComponentKey: EngineComponentKey;
  frontComponentId?: string;
  workflowVersionId?: string;
  coreWorkflowVersionId?: string;
  availabilityType?: CommandMenuItemAvailabilityType;
  availabilityObjectMetadataId?: string | null;
  payload?: CommandMenuItemPayload | null;
  navigationTargetObjectMetadataId?: string | null;
  creationTargetObjectMetadataId?: string;
  isInSidePanel?: boolean;
};

export const useMountCommand = () => {
  const store = useStore();

  const mountCommand = useCallback(
    async ({
      engineCommandId,
      contextStoreInstanceId,
      engineComponentKey,
      payload,
      navigationTargetObjectMetadataId,
      creationTargetObjectMetadataId,
      isInSidePanel,
    }: MountCommandParams) => {
      const headlessEngineCommandContextApi = buildHeadlessCommandContextApi({
        store,
        contextStoreInstanceId,
        engineComponentKey,
        payload,
        navigationTargetObjectMetadataId,
        creationTargetObjectMetadataId,
        isInSidePanel,
      });

      store.set(headlessCommandContextApisState.atom, (previousMap) => {
        const newMap = new Map(previousMap);

        newMap.set(engineCommandId, headlessEngineCommandContextApi);

        return newMap;
      });
    },
    [store],
  );

  return mountCommand;
};
