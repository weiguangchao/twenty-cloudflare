// Update shapes for standard field types the detail-page flow did not touch,
// plus validation errors. Reuses the documents the frontend sent.
export const FLOW = 'record-field-types-api';

const AIRBNB_ID = 'c776ee49-f608-4a77-8cc8-6fe96ae1e43f';
const ZOE_ID = '07394720-1c4d-4703-ace2-241ba54ea531';
const OPPORTUNITY_ID = '9457f8e9-16ae-43b9-92ee-cbd21f3dded5';

export const run = async (client) => {
  const q = client.findCapturedQuery;

  await client.signIn('alice@example.com', 'Password123!');

  const updateCompany = (input) =>
    client.graphql('UpdateOneCompany', q('UpdateOneCompany'), {
      idToUpdate: AIRBNB_ID,
      input,
    });
  const updatePerson = (input) =>
    client.graphql('UpdateOnePerson', q('UpdateOnePerson'), {
      idToUpdate: ZOE_ID,
      input,
    });

  await updateCompany({ employees: 6900 });
  await updateCompany({ idealCustomerProfile: true });
  await updateCompany({
    address: {
      addressStreet1: '888 Brannan St',
      addressStreet2: 'Floor 4',
      addressCity: 'San Francisco',
      addressState: 'CA',
      addressPostcode: '94103',
      addressCountry: 'United States',
      addressLat: null,
      addressLng: null,
    },
  });
  await updateCompany({
    domainName: {
      primaryLinkUrl: 'https://airbnb.com',
      primaryLinkLabel: '',
      secondaryLinks: [{ url: 'https://news.airbnb.com', label: 'News' }],
    },
  });
  await updateCompany({ employees: null });

  await updatePerson({
    emails: {
      primaryEmail: 'zoe@example.com',
      additionalEmails: ['zoe.alt@example.com'],
    },
  });
  await updatePerson({
    phones: {
      primaryPhoneNumber: '612345678',
      primaryPhoneCountryCode: 'FR',
      primaryPhoneCallingCode: '+33',
      additionalPhones: [
        { number: '2025550123', countryCode: 'US', callingCode: '+1' },
      ],
    },
  });
  await updatePerson({ companyId: null });

  await updatePerson({ emails: { primaryEmail: 'not-an-email' } });
  await updatePerson({ unknownField: 'x' });
  await client.graphql('UpdateOneOpportunity', q('UpdateOneOpportunity'), {
    idToUpdate: OPPORTUNITY_ID,
    input: { stage: 'NOT_A_STAGE' },
  });
  await client.graphql('UpdateOneOpportunity', q('UpdateOneOpportunity'), {
    idToUpdate: '00000000-0000-0000-0000-000000000000',
    input: { name: 'Ghost' },
  });
  await client.graphql('UpdateOneOpportunity', q('UpdateOneOpportunity'), {
    idToUpdate: 'not-a-uuid',
    input: { name: 'Ghost' },
  });
};
