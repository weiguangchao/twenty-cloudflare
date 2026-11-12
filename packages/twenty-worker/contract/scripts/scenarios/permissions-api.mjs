// Behavior of the Read Only role (no edit/delete, person.jobTitle hidden)
// as seen by bob, captured before bob is removed from the workspace.
export const FLOW = 'permissions-api';

const ZOE_ID = '07394720-1c4d-4703-ace2-241ba54ea531';

export const run = async (client) => {
  const q = client.findCapturedQuery;

  await client.signIn('bob@example.com', 'Password123!');

  await client.metadata('GetCurrentUser', q('GetCurrentUser'), {});

  await client.graphql(
    'FindPeopleWithJobTitle',
    'query FindPeopleWithJobTitle { people(first: 2) { edges { node { id name { firstName } jobTitle } } } }',
    {},
  );
  await client.graphql(
    'FindPeopleWithoutJobTitle',
    'query FindPeopleWithoutJobTitle { people(first: 2) { edges { node { id name { firstName } } } } }',
    {},
  );
  await client.graphql(
    'FilterPeopleByJobTitle',
    'query FilterPeopleByJobTitle { people(first: 2, filter: { jobTitle: { eq: "Sales" } }) { edges { node { id } } } }',
    {},
  );
  await client.graphql(
    'SortPeopleByJobTitle',
    'query SortPeopleByJobTitle { people(first: 2, orderBy: [{ jobTitle: AscNullsFirst }]) { edges { node { id } } } }',
    {},
  );
  await client.graphql('UpdateOnePerson', q('UpdateOnePerson'), {
    idToUpdate: ZOE_ID,
    input: { name: { firstName: 'Hacked', lastName: 'Name' } },
  });
  await client.graphql('DeleteManyPeople', q('DeleteManyPeople'), {
    filter: { id: { in: [ZOE_ID] } },
  });
  await client.metadata(
    'CreateOneFieldMetadataItem',
    q('CreateOneFieldMetadataItem'),
    {
      input: {
        field: {
          label: 'Sneaky',
          name: 'sneaky',
          type: 'TEXT',
          objectMetadataId: '4f8c98aa-492f-41b7-97a6-345304d176f9',
          isLabelSyncedWithName: true,
        },
      },
    },
  );
};
