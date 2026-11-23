export const getWorkspaceStub = (env: Env, workspaceId: string) =>
  env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId), {
    locationHint: 'apac',
  });
