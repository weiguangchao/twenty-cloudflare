export const CRM_UI_OVERRIDE_EXEMPTIONS = [
  {
    filePath:
      'packages/crm-front/src/modules/activities/components/ActivityList.tsx',
    reason: 'Card.Root scrolls inside a full-height activity list',
  },
  {
    filePath:
      'packages/crm-front/src/modules/auth/sign-in-up/components/SignInUpGlobalScopeForm.tsx',
    reason: 'Separator spacing inside the sign-in form',
  },
  {
    filePath:
      'packages/crm-front/src/modules/auth/sign-in-up/components/SignInUpWorkspaceScopeForm.tsx',
    reason: 'Separator spacing inside the sign-in form',
  },
  {
    filePath:
      'packages/crm-front/src/modules/media-access/components/MediaAccessIndicator.tsx',
    reason: 'Popover.Popup sized and spaced for the recording sessions list',
  },
  {
    filePath:
      'packages/crm-front/src/modules/navigation/components/MobileNavigationBar.tsx',
    reason:
      'IconButton sized as a 40px touch target with the current page fill',
  },
  {
    filePath:
      'packages/crm-front/src/modules/onboarding/components/OnboardingSkipDialog.tsx',
    reason: 'Dialog.Header centers the visual and anchors the close button',
  },
  {
    filePath:
      'packages/crm-front/src/modules/settings/components/SettingsCard.tsx',
    reason:
      'Compact Card.Content column for the settings card header and description',
  },
  {
    filePath:
      'packages/crm-front/src/modules/settings/components/SettingsListCard.tsx',
    reason: 'Card.Footer laid out around the add button',
  },
  {
    filePath:
      'packages/crm-front/src/modules/settings/components/SettingsOptions/SettingsCardContentBase.tsx',
    reason: 'Card.Content laid out as a settings option row',
  },
  {
    filePath:
      'packages/crm-front/src/modules/settings/data-model/components/SettingsDataModelPreviewFormCard.tsx',
    reason: 'Tinted preview Card.Content and unpadded form Card.Content',
  },
  {
    filePath:
      'packages/crm-front/src/modules/settings/data-model/components/SettingsDataModelPreviewMiniCard.tsx',
    reason: 'Compact Card.Content with primary text for field previews',
  },
  {
    filePath:
      'packages/crm-front/src/modules/settings/data-model/fields/forms/select/components/SettingsDataModelFieldSelectForm.tsx',
    reason: 'Card.Footer laid out around the add option button',
  },
  {
    filePath:
      'packages/crm-front/src/modules/settings/data-model/graph-overview/components/SettingsDataModelOverview.tsx',
    reason: 'React Flow panel classes on ButtonGroup',
  },
  {
    filePath:
      'packages/crm-front/src/modules/settings/data-model/objects/forms/components/SettingsDataModelObjectSettingsFormCard.tsx',
    reason: 'Tinted preview Card.Content',
  },
  {
    filePath:
      'packages/crm-front/src/modules/side-panel/pages/page-layout/components/ChartTypeSelectionSection.tsx',
    reason:
      'Chart type icon tiles preserve their border, shape and selection colors',
  },
  {
    filePath:
      'packages/crm-front/src/modules/spreadsheet-import/components/SpreadSheetImportModalWrapper.tsx',
    reason: 'Dialog.Popup keeps the xl height across import steps',
  },
  {
    filePath:
      'packages/crm-front/src/modules/spreadsheet-import/components/SpreadsheetImportStepBody.tsx',
    reason: 'Dialog.Body laid out as a full-height import step',
  },
  {
    filePath:
      'packages/crm-front/src/modules/spreadsheet-import/components/StepNavigationButton.tsx',
    reason: 'Dialog.Footer laid out as the import step navigation bar',
  },
  {
    filePath:
      'packages/crm-front/src/modules/side-panel/pages/page-layout/components/chart-settings/ChartSettingsDropdownSection.tsx',
    reason:
      'Dropdown.Section preserves the chart settings list height inside the side panel',
  },
  {
    filePath:
      'packages/crm-front/src/modules/ui/feedback/skeleton/components/SkeletonLine.tsx',
    reason: 'Forwards the caller className and style to Skeleton',
  },
  {
    filePath:
      'packages/crm-front/src/modules/ui/feedback/toast/components/AppToaster.tsx',
    reason: 'Toaster stacking order above the app layers',
  },
  {
    filePath:
      'packages/crm-front/src/modules/ui/input/components/FormFieldInputContainer.tsx',
    reason: 'Field.Root as a full-width column',
  },
  {
    filePath:
      'packages/crm-front/src/modules/ui/layout/dialog/components/DialogInstance.tsx',
    reason:
      'Runtime position and stacking of Dialog.Backdrop and Dialog.Viewport',
  },
  {
    filePath:
      'packages/crm-front/src/modules/ui/layout/draggable-list/components/DraggableListRow.tsx',
    reason: 'Drag host grip swapping and placement of separate row actions',
  },
  {
    filePath:
      'packages/crm-front/src/modules/ui/layout/tab-list/components/TabListRoot.tsx',
    reason: 'Tabs.Root rendered as a display contents adapter',
  },
  {
    filePath:
      'packages/crm-front/src/modules/ui/suggestion/components/SuggestionListItem.tsx',
    reason:
      'Editor integration keeps the active suggestion fill while focus stays in the editor',
  },
] as const;
