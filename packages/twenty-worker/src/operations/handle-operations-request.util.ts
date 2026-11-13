import { timingSafeEqual } from 'node:crypto';
import { isPlainObject } from 'twenty-shared/utils';

import { logEvent } from '@/observability/log-event.util';
import { getWorkspaceStub } from '@/workspace/get-workspace-stub.util';

export const handleOperationsRequest = async (request: Request, env: Env) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!env.OPERATIONS_TOKEN || !token || token.length > 1024)
    return new Response(null, { status: 404 });
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(token)),
    crypto.subtle.digest('SHA-256', encoder.encode(env.OPERATIONS_TOKEN)),
  ]);
  if (!timingSafeEqual(new Uint8Array(actual), new Uint8Array(expected)))
    return new Response(null, { status: 404 });
  try {
    const input: unknown = await request.json();
    if (
      !isPlainObject(input) ||
      typeof input.workspaceId !== 'string' ||
      !/^(?:recovery-drill-)?[a-f0-9-]{36}$/.test(input.workspaceId)
    )
      return new Response(null, { status: 400 });
    const workspace = getWorkspaceStub(env, input.workspaceId);
    let result: unknown;
    switch (input.action) {
      case 'snapshot':
        result = await workspace.recoverySnapshot();
        break;
      case 'prepare-restore':
        if (
          (!input.workspaceId.startsWith('recovery-drill-') &&
            env.MAINTENANCE_MODE !== 'true') ||
          typeof input.bookmark !== 'string'
        )
          return Response.json(
            { error: 'MAINTENANCE_REQUIRED' },
            { status: 409 },
          );
        result = await workspace.prepareRecovery(input.bookmark);
        break;
      case 'restart':
        if (
          !input.workspaceId.startsWith('recovery-drill-') &&
          env.MAINTENANCE_MODE !== 'true'
        )
          return Response.json(
            { error: 'MAINTENANCE_REQUIRED' },
            { status: 409 },
          );
        await workspace.restartForRecovery();
        break;
      case 'write-drill-marker':
        if (
          !input.workspaceId.startsWith('recovery-drill-') ||
          typeof input.marker !== 'string' ||
          input.marker.length > 100
        )
          return new Response(null, { status: 400 });
        result = await workspace.writeRecoveryDrillMarker(input.marker);
        break;
      case 'delete-drill':
        if (!input.workspaceId.startsWith('recovery-drill-'))
          return new Response(null, { status: 400 });
        await workspace.deleteRecoveryDrill();
        break;
      default:
        return new Response(null, { status: 400 });
    }
    logEvent({
      event: 'workspace_operations',
      workspaceId: input.workspaceId,
      operation: input.action,
    });
    return Response.json(result ?? { success: true }, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'OPERATIONS_FAILED' }, { status: 500 });
  }
};
