export const RECORD_COMPOSITE_NULL_EQUIVALENTS: Record<
  string,
  Record<string, unknown>
> = {
  ADDRESS: {
    addressStreet1: '',
    addressStreet2: '',
    addressCity: '',
    addressState: '',
    addressCountry: '',
    addressPostcode: '',
  },
  EMAILS: { primaryEmail: '', additionalEmails: [] },
  LINKS: { primaryLinkUrl: '', primaryLinkLabel: '', secondaryLinks: [] },
  PHONES: {
    primaryPhoneNumber: '',
    primaryPhoneCountryCode: '',
    primaryPhoneCallingCode: '',
    additionalPhones: [],
  },
  FULL_NAME: { firstName: '', lastName: '' },
  ACTOR: { name: '' },
  RICH_TEXT: { markdown: '' },
};
