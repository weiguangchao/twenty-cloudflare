// Removes the person.sneaky field created by the permissions scenario so the
// exported SDL and metadata only carry the intended custom data model.
export const FLOW = 'cleanup-api';

const SNEAKY_FIELD_ID = 'a13a2063-f4c6-4b5b-9302-8db3ba53697a';

export const run = async (client) => {
  const q = client.findCapturedQuery;

  await client.signIn('alice@example.com', 'Password123!');
  await client.metadata(
    'UpdateOneFieldMetadataItem',
    q('UpdateOneFieldMetadataItem'),
    {
      idToUpdate: SNEAKY_FIELD_ID,
      updatePayload: { isActive: false },
    },
  );
  await new Promise((resolve) => setTimeout(resolve, 8000));
  await client.metadata(
    'DeleteOneFieldMetadataItem',
    q('DeleteOneFieldMetadataItem'),
    { idToDelete: SNEAKY_FIELD_ID },
  );
};
