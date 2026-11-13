export type WorkspaceFile = {
  id: string;
  workspaceId: string;
  createdByUserWorkspaceId: string;
  fieldMetadataId: string | null;
  applicationUniversalIdentifier: string;
  folder: 'core-picture' | 'files-field';
  filename: string;
  path: string;
  storageKey: string;
  declaredSize: number;
  size: number;
  mimeType: string;
  status:
    | 'PENDING'
    | 'UPLOADING'
    | 'STORED'
    | 'COMPLETING'
    | 'UPLOADED'
    | 'DELETING';
  leaseId: string | null;
  leaseUntil: number | null;
  expiresAt: number;
  createdAt: string;
  updatedAt: string;
};

export type FileUrlContext = {
  workspaceId: string;
  origin: string;
  secret: string;
};
