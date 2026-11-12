// Write and read every custom field type on the custom object created in the
// data-model flow (renamed to initiative), including relations and morph.
export const FLOW = 'custom-object-records-api';

const INITIATIVE_ID = '11b170fb-3229-40e9-8c51-e42cf4a3d12f';
const ZOE_ID = '07394720-1c4d-4703-ace2-241ba54ea531';
const AIRBNB_ID = 'c776ee49-f608-4a77-8cc8-6fe96ae1e43f';
const OPPORTUNITY_ID = '9457f8e9-16ae-43b9-92ee-cbd21f3dded5';

export const run = async (client) => {
  const q = client.findCapturedQuery;

  await client.signIn('alice@example.com', 'Password123!');

  const update = (input) =>
    client.graphql('UpdateOneInitiative', q('UpdateOneInitiative'), {
      idToUpdate: INITIATIVE_ID,
      input,
    });

  await update({ isActive: false });
  await update({ kickoffAt: '2026-11-20T09:30:00.000Z' });
  await update({ dueDate: '2026-12-31' });
  await update({ phase: 'EXECUTION' });
  await update({ tags: ['OPTION_1'] });
  await update({ priority: 'RATING_4' });
  await update({ cost: { amountMicros: 25000000000, currencyCode: 'EUR' } });
  await update({
    website: {
      primaryLinkUrl: 'https://example.com',
      primaryLinkLabel: 'Site',
      secondaryLinks: [],
    },
  });
  await update({
    hotline: {
      primaryPhoneNumber: '2025550123',
      primaryPhoneCountryCode: 'US',
      primaryPhoneCallingCode: '+1',
      additionalPhones: [],
    },
  });
  await update({ sponsorName: { firstName: 'Grace', lastName: 'Hopper' } });
  await update({
    siteAddress: {
      addressStreet1: '1 Rue de Rivoli',
      addressStreet2: null,
      addressCity: 'Paris',
      addressState: null,
      addressPostcode: '75001',
      addressCountry: 'France',
      addressLat: 48.8606,
      addressLng: 2.3376,
    },
  });
  await update({
    summary: {
      blocknote: JSON.stringify([
        {
          id: 'b1',
          type: 'paragraph',
          props: {},
          content: [{ type: 'text', text: 'Revamp the site', styles: {} }],
          children: [],
        },
      ]),
      markdown: 'Revamp the site',
    },
  });
  await update({
    settingsJson: { theme: 'dark', retries: 3, nested: { a: [1, 2] } },
  });
  await update({ aliases: ['revamp', 'site-v2'] });
  await update({ leadId: ZOE_ID });
  await update({ ownerCompanyId: AIRBNB_ID });
  await update({ phase: 'NOT_AN_OPTION' });
  await update({ priority: 'RATING_9' });

  await client.graphql('UpdateOneOpportunity', q('UpdateOneOpportunity'), {
    idToUpdate: OPPORTUNITY_ID,
    input: { projectId: INITIATIVE_ID },
  });

  await client.graphql('FindOneInitiative', q('FindOneInitiative'), {
    objectRecordId: INITIATIVE_ID,
  });
};
