import { env, runInDurableObject } from 'cloudflare:test';

import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';

export const runInNewWorkspace = <TResult>(
  callback: (
    state: DurableObjectState,
    instance: WorkspaceDurableObject,
  ) => TResult | Promise<TResult>,
): Promise<TResult> =>
  runInDurableObject(
    env.WORKSPACE.get(env.WORKSPACE.newUniqueId()),
    (instance: WorkspaceDurableObject, state) => callback(state, instance),
  );
