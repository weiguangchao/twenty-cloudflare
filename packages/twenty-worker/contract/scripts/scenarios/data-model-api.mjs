// Relation and morph relation creation (the settings form did not send a
// relation payload when driven by Playwright), plus validation errors.
export const FLOW = 'data-model-api';

const PROJECT_OBJECT_ID = 'a3cddb99-f8f2-410d-967b-4b7798e1d29d';
const PERSON_OBJECT_ID = '4f8c98aa-492f-41b7-97a6-345304d176f9';
const COMPANY_OBJECT_ID = '8f53e227-405f-4df9-b53d-9adbf3742d6d';
const OPPORTUNITY_OBJECT_ID = '36ad4145-8501-4dcc-8a41-635db07d4615';

export const run = async (client) => {
  const createField = (field) =>
    client.metadata(
      'CreateOneFieldMetadataItem',
      client.findCapturedQuery('CreateOneFieldMetadataItem'),
      { input: { field } },
    );

  await client.signIn('alice@example.com', 'Password123!');

  await createField({
    description: null,
    icon: 'IconRelationManyToOne',
    label: 'Lead',
    name: 'lead',
    isLabelSyncedWithName: true,
    objectMetadataId: PROJECT_OBJECT_ID,
    type: 'RELATION',
    relationCreationPayload: {
      type: 'MANY_TO_ONE',
      targetObjectMetadataId: PERSON_OBJECT_ID,
      targetFieldLabel: 'Led Projects',
      targetFieldIcon: 'IconUsers',
    },
  });

  await createField({
    description: null,
    icon: 'IconRelationOneToMany',
    label: 'Opportunities',
    name: 'opportunities',
    isLabelSyncedWithName: true,
    objectMetadataId: PROJECT_OBJECT_ID,
    type: 'RELATION',
    relationCreationPayload: {
      type: 'ONE_TO_MANY',
      targetObjectMetadataId: OPPORTUNITY_OBJECT_ID,
      targetFieldLabel: 'Project',
      targetFieldIcon: 'IconListNumbers',
    },
  });

  await createField({
    description: null,
    icon: 'IconRelationManyToOne',
    label: 'Owner',
    name: 'owner',
    isLabelSyncedWithName: false,
    objectMetadataId: PROJECT_OBJECT_ID,
    type: 'MORPH_RELATION',
    morphRelationsCreationPayload: [PERSON_OBJECT_ID, COMPANY_OBJECT_ID].map(
      (targetObjectMetadataId) => ({
        type: 'MANY_TO_ONE',
        targetObjectMetadataId,
        targetFieldLabel: 'Owned Projects',
        targetFieldIcon: 'IconUsers',
      }),
    ),
  });

  await createField({
    description: null,
    icon: 'IconAbc',
    label: 'Code',
    name: 'code',
    isLabelSyncedWithName: true,
    objectMetadataId: PROJECT_OBJECT_ID,
    type: 'TEXT',
  });

  await createField({
    description: null,
    icon: 'IconAbc',
    label: 'Id',
    name: 'id',
    isLabelSyncedWithName: true,
    objectMetadataId: PROJECT_OBJECT_ID,
    type: 'TEXT',
  });

  await createField({
    description: null,
    icon: 'IconAbc',
    label: 'Bad Name',
    name: 'Bad Name!',
    isLabelSyncedWithName: false,
    objectMetadataId: PROJECT_OBJECT_ID,
    type: 'TEXT',
  });

  await client.metadata(
    'CreateOneObjectMetadataItem',
    client.findCapturedQuery('CreateOneObjectMetadataItem'),
    {
      input: {
        object: {
          labelSingular: 'Person',
          labelPlural: 'People',
          nameSingular: 'person',
          namePlural: 'people',
          icon: 'IconUser',
          isLabelSyncedWithName: true,
        },
      },
    },
  );
};
