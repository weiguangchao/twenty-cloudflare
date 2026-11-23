import { FieldMetadataType } from '@/types';
import { COMPOSITE_FIELD_SUB_FIELD_MATCHERS_MAP } from '@/utils/filter/utils/compositeFieldSubFieldMatchersMap';
import { isMatchingCompositeFilter } from '@/utils/filter/utils/isMatchingCompositeFilter';

const LINKS_MATCHERS =
  COMPOSITE_FIELD_SUB_FIELD_MATCHERS_MAP[FieldMetadataType.LINKS] ?? {};

const isMatchingLinksFilter = ({
  compositeFilter,
  compositeValue,
}: {
  compositeFilter: Record<string, object | undefined>;
  compositeValue: Record<string, unknown> | null;
}) =>
  isMatchingCompositeFilter({
    compositeFilter,
    compositeValue,
    subFieldMatchers: LINKS_MATCHERS,
  });

const LINKS_VALUE = {
  primaryLinkUrl: 'https://example.com',
  primaryLinkLabel: 'Example',
  secondaryLinks: [{ url: 'https://docs.example.com', label: 'Docs' }],
};

describe('isMatchingCompositeFilter', () => {
  it('matches when every sub-filter matches', () => {
    expect(
      isMatchingLinksFilter({
        compositeFilter: {
          primaryLinkUrl: { ilike: '%example%' },
          primaryLinkLabel: { eq: 'Example' },
        },
        compositeValue: LINKS_VALUE,
      }),
    ).toBe(true);
  });

  it('does not match when one sub-filter fails', () => {
    expect(
      isMatchingLinksFilter({
        compositeFilter: {
          primaryLinkUrl: { ilike: '%example%' },
          primaryLinkLabel: { eq: 'Other' },
        },
        compositeValue: LINKS_VALUE,
      }),
    ).toBe(false);
  });

  it('ignores absent and empty sub-filters', () => {
    expect(
      isMatchingLinksFilter({
        compositeFilter: { primaryLinkUrl: {}, primaryLinkLabel: undefined },
        compositeValue: LINKS_VALUE,
      }),
    ).toBe(true);
  });

  it('does not match a sub-field without a matcher', () => {
    expect(
      isMatchingLinksFilter({
        compositeFilter: { unknownSubField: { eq: 'Twenty' } },
        compositeValue: LINKS_VALUE,
      }),
    ).toBe(false);
  });

  it('matches a missing value only with IS NULL', () => {
    expect(
      isMatchingLinksFilter({
        compositeFilter: { primaryLinkLabel: { is: 'NULL' } },
        compositeValue: null,
      }),
    ).toBe(true);

    expect(
      isMatchingLinksFilter({
        compositeFilter: { primaryLinkLabel: { eq: 'Example' } },
        compositeValue: { primaryLinkLabel: null },
      }),
    ).toBe(false);
  });

  it('matches secondary links through their JSON content', () => {
    expect(
      isMatchingLinksFilter({
        compositeFilter: { secondaryLinks: { like: '%docs.example.com%' } },
        compositeValue: LINKS_VALUE,
      }),
    ).toBe(true);
  });
});
