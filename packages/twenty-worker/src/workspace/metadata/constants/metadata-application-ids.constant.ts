import standardMetadataSeed from '@/workspace/seed/standard-metadata.json';

const findApplicationId = (name: string) => {
  const application = standardMetadataSeed.applications.find(
    (candidate) => candidate.name === name,
  );

  if (application === undefined) {
    throw new Error(`The seed has no ${name} application`);
  }

  return application.id;
};

// Rows owned by the standard application are the protected standard
// metadata; everything users create belongs to the custom application.
export const STANDARD_APPLICATION_ID = findApplicationId('Standard');

export const CUSTOM_APPLICATION_ID = findApplicationId('Custom');
