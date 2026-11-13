import { type MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import standardMetadata from '@/workspace/seed/standard-metadata.json';

export const getWorkspaceApplications = (store: MetadataStore) => {
  const roles = store.findMany('role');
  const createdAt =
    store.findMany('objectMetadata')[0]?.createdAt ?? new Date().toISOString();

  return standardMetadata.applications.map((application) => ({
    ...application,
    description: null,
    logoUrl: null,
    version: '1.0.1',
    availablePackages: {},
    applicationRegistrationId: null,
    applicationRegistration: null,
    defaultRoleId:
      roles.find((role) => role.applicationId === application.id)?.id ?? null,
    canBeUninstalled: false,
    autoUpgrade: false,
    runOnUserPreferences: false,
    createdAt,
    requestedIframeMediaPermissions: [],
    grantedIframeMediaPermissions: [],
    isUninstallBlockedByOtherWorkspaceInstallations: false,
  }));
};
