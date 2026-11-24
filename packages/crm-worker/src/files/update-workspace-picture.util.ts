import { requireWorkspace } from '@/auth/workspace-lifecycle.service';
import { fileRpc } from '@/files/file-rpc.util';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';

export const updateWorkspacePicture = async (
  context: MetadataContext,
  value: unknown,
  purpose: 'avatar' | 'logo',
) => {
  const { auth, workspace, membership } = await requireWorkspace(context);
  let id: string | null = null;
  if (value !== null) {
    if (typeof value !== 'string') throw apiError('Invalid picture URL');
    let pathname: string;
    try {
      pathname = new URL(value).pathname;
    } catch {
      throw apiError('Invalid picture URL');
    }
    const match = /^\/file\/core-picture\/([0-9a-f-]{36})$/.exec(pathname);
    if (!match) throw apiError('Invalid picture URL');
    id = match[1];
  }
  await fileRpc(
    context.workspace(workspace.id),
    'picture',
    {
      id,
      purpose,
      workspaceId: workspace.id,
      origin: new URL(context.request.url).origin,
    },
    {
      userId: auth.userId,
      userWorkspaceId: membership.id,
      workspaceMemberId: membership.workspaceMemberId,
    },
  );
};
