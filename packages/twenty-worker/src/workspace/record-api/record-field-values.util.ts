const SELECTED_RECORD_FIELDS = Symbol('selectedRecordFields');

type SelectedRecord = { [SELECTED_RECORD_FIELDS]?: Map<string, unknown> };

export const setRecordFieldValue = (
  source: object,
  key: string,
  value: unknown,
) => {
  const selected = source as SelectedRecord;
  if (!selected[SELECTED_RECORD_FIELDS])
    Object.defineProperty(selected, SELECTED_RECORD_FIELDS, {
      value: new Map<string, unknown>(),
    });
  selected[SELECTED_RECORD_FIELDS]!.set(key, value);
};

export const selectedRecordFields = (source: unknown) =>
  source !== null && typeof source === 'object'
    ? (source as SelectedRecord)[SELECTED_RECORD_FIELDS]
    : undefined;
