import { SidePanelCommandMenuItemDisplayPage } from '@/command-menu-item/display/components/SidePanelCommandMenuItemDisplayPage';
import { SidePanelRoutedPage } from '@/side-panel/routing/components/SidePanelRoutedPage';
import { SidePanelCreateRelatedRecordPage } from '@/side-panel/pages/create-related-record/components/SidePanelCreateRelatedRecordPage';
import { SidePanelRecordCreationFormPage } from '@/side-panel/pages/record-creation-form/components/SidePanelRecordCreationFormPage';
import { SidePanelRecordCreationFormSettingsPage } from '@/side-panel/pages/record-creation-form-settings/components/SidePanelRecordCreationFormSettingsPage';
import { SidePanelShareRecordPage } from '@/side-panel/pages/share-record/components/SidePanelShareRecordPage';
import { SidePanelDashboardChartSettings } from '@/side-panel/pages/page-layout/components/dashboard/SidePanelDashboardChartSettings';
import { SidePanelDashboardIframeSettings } from '@/side-panel/pages/page-layout/components/dashboard/SidePanelDashboardIframeSettings';
import { SidePanelDashboardRecordTableSettings } from '@/side-panel/pages/page-layout/components/dashboard/SidePanelDashboardRecordTableSettings';
import { SidePanelRecordPageFieldSettings } from '@/side-panel/pages/page-layout/components/record-page/SidePanelRecordPageFieldSettings';
import { SidePanelRecordPageFieldsSettings } from '@/side-panel/pages/page-layout/components/record-page/SidePanelRecordPageFieldsSettings';
import { SidePanelPageLayoutDashboardWidgetTypeSelect } from '@/side-panel/pages/page-layout/components/SidePanelPageLayoutDashboardWidgetTypeSelect';
import { SidePanelPageLayoutRecordPageWidgetTypeSelect } from '@/side-panel/pages/page-layout/components/SidePanelPageLayoutRecordPageWidgetTypeSelect';
import { SidePanelPageLayoutTabSettings } from '@/side-panel/pages/page-layout/components/SidePanelPageLayoutTabSettings';
import { SidePanelPageLayoutWidgetSettings } from '@/side-panel/pages/page-layout/components/SidePanelPageLayoutWidgetSettings';
import { SidePanelMergeRecordPage } from '@/side-panel/pages/record-page/components/SidePanelMergeRecordPage';
import { SidePanelMergeWithRecordPage } from '@/side-panel/pages/merge-with-record/components/SidePanelMergeWithRecordPage';
import { SidePanelEditRichTextPage } from '@/side-panel/pages/rich-text-page/components/SidePanelEditRichTextPage';
import { SidePanelSearchRecordsPage } from '@/side-panel/pages/search/components/SidePanelSearchRecordsPage';
import { type ActiveSidePanelPage } from '@/side-panel/types/SidePanelPage';

export const SIDE_PANEL_PAGES_CONFIG = new Map<
  ActiveSidePanelPage,
  React.ReactNode
>([
  [SidePanelPages.CommandMenuDisplay, <SidePanelCommandMenuItemDisplayPage />],
  [SidePanelPages.MergeRecords, <SidePanelMergeRecordPage />],
  [SidePanelPages.MergeWithRecord, <SidePanelMergeWithRecordPage />],
  [SidePanelPages.EditRichText, <SidePanelEditRichTextPage />],

  [SidePanelPages.SearchRecords, <SidePanelSearchRecordsPage />],
  [
    SidePanelPages.PageLayoutDashboardWidgetTypeSelect,
    <SidePanelPageLayoutDashboardWidgetTypeSelect />,
  ],
  [SidePanelPages.DashboardChartSettings, <SidePanelDashboardChartSettings />],
  [
    SidePanelPages.DashboardIframeSettings,
    <SidePanelDashboardIframeSettings />,
  ],
  [SidePanelPages.PageLayoutTabSettings, <SidePanelPageLayoutTabSettings />],
  [
    SidePanelPages.PageLayoutWidgetSettings,
    <SidePanelPageLayoutWidgetSettings />,
  ],
  [
    SidePanelPages.DashboardRecordTableSettings,
    <SidePanelDashboardRecordTableSettings />,
  ],
  [
    SidePanelPages.RecordPageFieldsSettings,
    <SidePanelRecordPageFieldsSettings />,
  ],
  [
    SidePanelPages.RecordPageFieldSettings,
    <SidePanelRecordPageFieldSettings />,
  ],
  [
    SidePanelPages.PageLayoutRecordPageWidgetTypeSelect,
    <SidePanelPageLayoutRecordPageWidgetTypeSelect />,
  ],
  [SidePanelPages.CreateRelatedRecord, <SidePanelCreateRelatedRecordPage />],
  [SidePanelPages.RecordCreationForm, <SidePanelRecordCreationFormPage />],
  [
    SidePanelPages.RecordCreationFormSettings,
    <SidePanelRecordCreationFormSettingsPage />,
  ],
  [SidePanelPages.RoutedPage, <SidePanelRoutedPage />],
  [SidePanelPages.ShareRecord, <SidePanelShareRecordPage />],
]);
import { SidePanelPages } from 'crm-shared/types';
