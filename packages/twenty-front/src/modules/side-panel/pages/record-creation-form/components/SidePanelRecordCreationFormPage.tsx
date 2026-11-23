import { getToastOptionsFromError } from '@/error-handler/utils/getToastOptionsFromError';
import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { HeaderIdentifier } from '@/ui/layout/page/components/HeaderIdentifier';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { SidePanelOptionsDropdown } from '@/side-panel/components/SidePanelOptionsDropdown';
import { SIDE_PANEL_FOCUS_ID } from '@/side-panel/constants/SidePanelFocusId';
import { currentFocusIdSelector } from '@/ui/utilities/focus/states/currentFocusIdSelector';
import { useHotkeysOnFocusedElement } from '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useObjectMetadataItemById } from '@/object-metadata/hooks/useObjectMetadataItemById';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { getFieldPermissions } from '@/object-metadata/utils/getFieldPermissions';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { recordFieldInputIsFieldInErrorComponentState } from '@/object-record/record-field/ui/states/recordFieldInputIsFieldInErrorComponentState';
import { RecordFormFieldInputs } from '@/object-record/record-form/components/RecordFormFieldInputs';
import { useRecordCreationFormSettle } from '@/object-record/record-form/hooks/useRecordCreationFormSettle';
import { useRecordFormFields } from '@/object-record/record-form/hooks/useRecordFormFields';
import { computeRecordFormCreateRecordInput } from '@/object-record/record-form/utils/computeRecordFormCreateRecordInput';
import { getRecordFormFieldInputInstanceId } from '@/object-record/record-form/utils/getRecordFormFieldInputInstanceId';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useOpenRecordCreationFormSettingsInSidePanel } from '@/side-panel/hooks/useOpenRecordCreationFormSettingsInSidePanel';
import { recordCreationFormAreHiddenFieldsShownComponentState } from '@/side-panel/pages/record-creation-form/states/recordCreationFormAreHiddenFieldsShownComponentState';
import { recordCreationFormDraftComponentState } from '@/side-panel/pages/record-creation-form/states/recordCreationFormDraftComponentState';
import { recordCreationFormRequestComponentState } from '@/side-panel/pages/record-creation-form/states/recordCreationFormRequestComponentState';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useStore } from 'jotai';
import { useId, useState } from 'react';
import { styled } from '@linaria/react';
import { Key } from 'ts-key-enum';
import { type JsonValue } from 'type-fest';
import { PermissionFlagType } from 'twenty-shared/constants';
import { isDefined } from 'twenty-shared/utils';
import { useToast } from 'twenty-ui/components/feedback';
import { LightButton } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import {
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconPlus,
} from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import { useLingui } from '@lingui/react/macro';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  outline: none;
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledHiddenFieldsToggle = styled.div`
  display: flex;
`;

export const SidePanelRecordCreationFormPage = () => {
  const recordCreationFormRequest = useAtomComponentStateValue(
    recordCreationFormRequestComponentState,
  );

  if (!isDefined(recordCreationFormRequest)) {
    return null;
  }

  return (
    <SidePanelRecordCreationForm
      requestId={recordCreationFormRequest.requestId}
      objectMetadataId={recordCreationFormRequest.objectMetadataId}
      initialDraftRecord={recordCreationFormRequest.initialDraftRecord}
      canCreateAnother={recordCreationFormRequest.canCreateAnother}
    />
  );
};

const SidePanelRecordCreationForm = ({
  requestId,
  objectMetadataId,
  initialDraftRecord,
  canCreateAnother,
}: {
  requestId: string;
  objectMetadataId: string;
  initialDraftRecord: Partial<ObjectRecord>;
  canCreateAnother: boolean;
}) => {
  const { t } = useLingui();
  const { objectMetadataItem } = useObjectMetadataItemById({
    objectId: objectMetadataId,
  });

  const { objectMetadataItems } = useObjectMetadataItems();
  const theme = useTheme();

  const store = useStore();
  const { settleRecordCreationDraft } = useRecordCreationFormSettle();
  const { enqueueToast } = useToast();

  const [recordCreationFormDraft, setRecordCreationFormDraft] =
    useAtomComponentState(recordCreationFormDraftComponentState);

  const [
    recordCreationFormAreHiddenFieldsShown,
    setRecordCreationFormAreHiddenFieldsShown,
  ] = useAtomComponentState(
    recordCreationFormAreHiddenFieldsShownComponentState,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formResetCount, setFormResetCount] = useState(0);
  const contentId = useId();
  const formMountId = useId();
  const formInstanceId = `${formMountId}-${formResetCount}`;
  const optionsDropdownId = useId();
  const currentFocusId = useAtomStateValue(currentFocusIdSelector);

  const draftRecord = recordCreationFormDraft ?? initialDraftRecord;

  const hasLayoutsPermission = useHasPermissionFlag(PermissionFlagType.LAYOUTS);

  const { openRecordCreationFormSettingsInSidePanel } =
    useOpenRecordCreationFormSettingsInSidePanel();

  const { recordFormFields } = useRecordFormFields({ objectMetadataItem });
  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );

  const editableRecordFormFields = recordFormFields.filter(
    ({ fieldMetadataItem }) =>
      getFieldPermissions({
        objectPermissions,
        fieldMetadataId: fieldMetadataItem.id,
      }).canUpdateField,
  );

  const visibleFieldMetadataItems = editableRecordFormFields
    .filter((recordFormField) => recordFormField.isVisible)
    .map((recordFormField) => recordFormField.fieldMetadataItem);

  const hiddenFieldMetadataItems = editableRecordFormFields
    .filter((recordFormField) => !recordFormField.isVisible)
    .map((recordFormField) => recordFormField.fieldMetadataItem);

  const hiddenFieldsCount = hiddenFieldMetadataItems.length;
  const editableFieldsCount = editableRecordFormFields.length;

  const displayedFieldMetadataItems = [
    ...visibleFieldMetadataItems,
    ...(recordCreationFormAreHiddenFieldsShown ? hiddenFieldMetadataItems : []),
  ];

  const updateDraftRecord = (gqlFieldName: string, value: JsonValue) => {
    setRecordCreationFormDraft((previousDraftRecord) => ({
      ...(previousDraftRecord ?? initialDraftRecord),
      [gqlFieldName]: value,
    }));
  };

  const handleFieldValueChange = (gqlFieldName: string, value: JsonValue) => {
    updateDraftRecord(gqlFieldName, value);
  };

  const handleFieldValueClear = (gqlFieldName: string) => {
    updateDraftRecord(gqlFieldName, null);
  };

  const getFieldInputIsInErrorAtom = (fieldMetadataId: string) =>
    recordFieldInputIsFieldInErrorComponentState.atomFamily({
      instanceId: getRecordFormFieldInputInstanceId({
        formInstanceId,
        fieldMetadataId,
      }),
    });

  const handleHiddenFieldsToggleClick = () => {
    // Collapsed inputs unmount and come back without their error text, so drop their error state too.
    if (recordCreationFormAreHiddenFieldsShown) {
      for (const fieldMetadataItem of hiddenFieldMetadataItems) {
        store.set(getFieldInputIsInErrorAtom(fieldMetadataItem.id), false);
      }
    }

    setRecordCreationFormAreHiddenFieldsShown(
      !recordCreationFormAreHiddenFieldsShown,
    );
  };

  const scrollToFirstFieldViolation = () =>
    document
      .getElementById(contentId)
      ?.querySelector('[role="alert"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const submitDraftRecord = async ({
    shouldKeepOpen,
  }: {
    shouldKeepOpen: boolean;
  }) => {
    if (isSubmitting) {
      return;
    }

    const isAnyDisplayedFieldInputInError = displayedFieldMetadataItems.some(
      (fieldMetadataItem) =>
        store.get(getFieldInputIsInErrorAtom(fieldMetadataItem.id)),
    );

    if (isAnyDisplayedFieldInputInError) {
      scrollToFirstFieldViolation();
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await settleRecordCreationDraft({
        requestId,
        draftRecord: computeRecordFormCreateRecordInput({
          draftRecord,
          fieldMetadataItems: objectMetadataItem.fields,
          objectMetadataItems,
        }),
        shouldKeepOpen,
      });

      if (!isDefined(error)) {
        if (shouldKeepOpen) {
          setRecordCreationFormDraft(null);
          setRecordCreationFormAreHiddenFieldsShown(false);
          setFormResetCount(
            (previousFormResetCount) => previousFormResetCount + 1,
          );
          enqueueToast({
            status: 'success',
            children: t`${objectMetadataItem.labelSingular} created`,
          });
        }

        return;
      }

      enqueueToast(getToastOptionsFromError({ error }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClick = () => submitDraftRecord({ shouldKeepOpen: false });

  const handleCreateAnotherClick = () =>
    submitDraftRecord({ shouldKeepOpen: true });

  const containerRef = useHotkeysOnFocusedElement({
    keys: [
      `${Key.Meta}+${Key.Enter}`,
      `${Key.Control}+${Key.Enter}`,
      ...(canCreateAnother ? [`${Key.Alt}+${Key.Enter}`] : []),
    ],
    focusId: currentFocusId ?? SIDE_PANEL_FOCUS_ID,
    callback: (keyboardEvent) =>
      keyboardEvent.altKey ? handleCreateAnotherClick() : handleCreateClick(),
    dependencies: [
      canCreateAnother,
      currentFocusId,
      handleCreateClick,
      handleCreateAnotherClick,
    ],
  });

  const isOptionsDropdownShown = canCreateAnother || hasLayoutsPermission;

  return (
    <StyledContainer ref={containerRef} tabIndex={-1}>
      <PageCardHeader
        title={
          <HeaderIdentifier
            icon={
              <ObjectMetadataIcon
                objectMetadataItem={objectMetadataItem}
                size={theme.icon.size.md}
                stroke={theme.icon.stroke.sm}
              />
            }
            title={t`Create ${objectMetadataItem.labelSingular}`}
          />
        }
      />
      <StyledContent key={formResetCount} id={contentId}>
        <RecordFormFieldInputs
          objectMetadataItem={objectMetadataItem}
          fieldMetadataItems={visibleFieldMetadataItems}
          draftRecord={draftRecord}
          onFieldValueChange={handleFieldValueChange}
          onFieldValueClear={handleFieldValueClear}
          formInstanceId={formInstanceId}
        />
        {hiddenFieldsCount > 0 && (
          <StyledHiddenFieldsToggle>
            <LightButton
              startIcon={
                recordCreationFormAreHiddenFieldsShown ? (
                  <IconChevronUp />
                ) : (
                  <IconChevronDown />
                )
              }
              onClick={handleHiddenFieldsToggleClick}
            >
              {recordCreationFormAreHiddenFieldsShown
                ? t`Hide fields`
                : t`All fields (${editableFieldsCount})`}
            </LightButton>
          </StyledHiddenFieldsToggle>
        )}
        {recordCreationFormAreHiddenFieldsShown && hiddenFieldsCount > 0 && (
          <RecordFormFieldInputs
            objectMetadataItem={objectMetadataItem}
            fieldMetadataItems={hiddenFieldMetadataItems}
            draftRecord={draftRecord}
            onFieldValueChange={handleFieldValueChange}
            onFieldValueClear={handleFieldValueClear}
            formInstanceId={formInstanceId}
          />
        )}
      </StyledContent>
      <SidePanelFooter
        actions={[
          isOptionsDropdownShown && (
            <SidePanelOptionsDropdown
              key="options"
              dropdownId={optionsDropdownId}
            >
              {canCreateAnother && (
                <Dropdown.ActionItem
                  startIcon={<IconPlus />}
                  shortcut={['Alt', 'Enter']}
                  disabled={isSubmitting}
                  onClick={handleCreateAnotherClick}
                >{t`Create another`}</Dropdown.ActionItem>
              )}
              {hasLayoutsPermission && (
                <Dropdown.ActionItem
                  startIcon={<IconEdit />}
                  onClick={() =>
                    openRecordCreationFormSettingsInSidePanel(
                      objectMetadataItem,
                    )
                  }
                >{t`Edit form`}</Dropdown.ActionItem>
              )}
            </SidePanelOptionsDropdown>
          ),
          <Button
            key="create-record"
            startIcon={<IconPlus />}
            size="sm"
            onClick={handleCreateClick}
            loading={isSubmitting}
            shortcut={['Mod', 'Enter']}
            data-testid="record-creation-form-create-button"
            variant="solid"
            color="accent"
          >{t`Create`}</Button>,
        ]}
      />
    </StyledContainer>
  );
};
