import { isDefined } from 'crm-shared/utils';
import { SidePanelMultipleRecordsInfo } from '@/side-panel/components/SidePanelMultipleRecordsInfo';
import { HeaderIdentifier } from '@/ui/layout/page/components/HeaderIdentifier';
import { SidePanelPageLayoutInfo } from '@/side-panel/components/SidePanelPageLayoutInfo';
import { SidePanelPages } from 'crm-shared/types';
import { useTheme } from 'crm-ui/theme';
import { type SidePanelContextChipProps } from '@/side-panel/types/SidePanelContextChipProps';

type SidePanelPageInfoProps = {
  pageChip: SidePanelContextChipProps | undefined;
};

export const SidePanelPageInfo = ({ pageChip }: SidePanelPageInfoProps) => {
  const theme = useTheme();

  if (!isDefined(pageChip)) {
    return null;
  }

  const pageLayoutSidePanelTarget = pageChip.page?.pageLayoutSidePanelTarget;

  if (isDefined(pageLayoutSidePanelTarget)) {
    return (
      <SidePanelPageLayoutInfo
        pageLayoutId={pageLayoutSidePanelTarget.pageLayoutId}
      />
    );
  }

  const isMultipleRecordsPage =
    pageChip.page?.page === SidePanelPages.UpdateRecords;

  if (isMultipleRecordsPage && isDefined(pageChip.page?.pageId)) {
    return (
      <SidePanelMultipleRecordsInfo
        sidePanelPageInstanceId={pageChip.page.pageId}
      />
    );
  }

  const shouldShowPageIcon = pageChip.page?.page
    ? [
        SidePanelPages.EmailBlockSettings,
        SidePanelPages.EmailPageStyle,
        SidePanelPages.EmailBlockStyle,
        SidePanelPages.AddToMessageList,
        SidePanelPages.ShareRecord,
        SidePanelPages.MergeWithRecord,
      ].includes(pageChip.page.page)
    : false;

  if (shouldShowPageIcon && isDefined(pageChip.page)) {
    const PageIcon = pageChip.page.pageIcon;

    return (
      <HeaderIdentifier
        icon={
          <PageIcon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
        }
        iconColor={theme.font.color.tertiary}
        title={pageChip.text ?? ''}
      />
    );
  }

  return <HeaderIdentifier title={pageChip.text ?? ''} />;
};
