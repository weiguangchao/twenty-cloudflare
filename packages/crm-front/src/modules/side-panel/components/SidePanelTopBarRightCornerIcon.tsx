import { SidePanelObjectFilterDropdown } from '@/side-panel/components/SidePanelObjectFilterDropdown';
import { sidePanelPageInfoSelector } from '@/side-panel/states/sidePanelPageInfoSelector';
import { sidePanelSearchObjectFilterState } from '@/side-panel/states/sidePanelSearchObjectFilterState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { SidePanelPages } from 'crm-shared/types';

export const SidePanelTopBarRightCornerIcon = () => {
  const sidePanelPage = useAtomStateValue(sidePanelPageInfoSelector).page;
  const [sidePanelSearchObjectFilter, setSidePanelSearchObjectFilter] =
    useAtomState(sidePanelSearchObjectFilterState);

  const isOnSearchPage = sidePanelPage === SidePanelPages.SearchRecords;

  return (
    <>
      {isOnSearchPage && (
        <SidePanelObjectFilterDropdown
          selectedObjectNameSingular={sidePanelSearchObjectFilter}
          onSelectObject={setSidePanelSearchObjectFilter}
        />
      )}
    </>
  );
};
