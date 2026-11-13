import { type GraphQLFieldResolver } from 'graphql';

import {
  createFileUpload,
  completeFileUpload,
  uploadLegacyFile,
} from '@/files/file-upload.service';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { currentUser } from '@/auth/current-user.service';
import { updateWorkspacePicture } from '@/files/update-workspace-picture.util';
import { apiError } from '@/shared/errors/api-error.util';
import { isPlainObject } from 'twenty-shared/utils';

export const FILE_MUTATION_RESOLVERS: Record<
  string,
  GraphQLFieldResolver<unknown, MetadataContext>
> = {
  updateWorkspace: async (_source, { data }, context) => {
    if (!isPlainObject(data) || Object.keys(data).some((key) => key !== 'logo'))
      throw apiError(
        'Workspace settings are not implemented yet',
        'NOT_IMPLEMENTED',
      );
    if ('logo' in data)
      await updateWorkspacePicture(context, data.logo, 'logo');
    return (await currentUser(context)).currentWorkspace;
  },
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
