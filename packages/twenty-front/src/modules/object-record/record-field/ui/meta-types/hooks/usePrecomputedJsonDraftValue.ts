import { isDefined, parseJson } from 'twenty-shared/utils';
import { type JsonValue } from 'type-fest';

export const usePrecomputedJsonDraftValue = ({
  draftValue,
}: {
  draftValue: string | undefined;
}): JsonValue => {
  const parsedJsonValue = isDefined(draftValue)
    ? parseJson<JsonValue>(draftValue)
    : null;

  return parsedJsonValue;
};
