import { type GraphQLFieldResolver } from 'graphql';

import {
  createFileUpload,
  completeFileUpload,
  uploadLegacyFile,
} from '@/files/file-upload.service';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';

export const FILE_MUTATION_RESOLVERS: Record<
  string,
  GraphQLFieldResolver<unknown, MetadataContext>
> = {
  createFileUpload: (_source, input, context) =>
    createFileUpload(context, input),
  createNewWorkspaceLogoUpload: (_source, input, context) =>
    createFileUpload(context, { ...input, fileFolder: 'CorePicture' }),
  completeFileUpload: (_source, input, context) =>
    completeFileUpload(context, input),
  completeWorkspaceLogoUpload: (_source, input, context) =>
    completeFileUpload(context, input, 'logo'),
  completeNewWorkspaceLogoUpload: (_source, input, context) =>
    completeFileUpload(context, input, 'logo'),
  completeWorkspaceMemberProfilePictureUpload: (_source, input, context) =>
    completeFileUpload(context, input, 'avatar'),
  uploadWorkspaceLogo: (_source, input, context) =>
    uploadLegacyFile(context, input, 'logo'),
  uploadNewWorkspaceLogo: (_source, input, context) =>
    uploadLegacyFile(context, input, 'logo'),
  uploadWorkspaceMemberProfilePicture: (_source, input, context) =>
    uploadLegacyFile(context, input, 'avatar'),
  uploadFilesFieldFileByUniversalIdentifier: (_source, input, context) =>
    uploadLegacyFile(context, input, 'file'),
};
