import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { handleOperationsRequest } from '@/operations/handle-operations-request.util';

const request = (token: string, input: unknown) =>
  new Request('https://crm.example.test/cloudflare/operations', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

describe('operator recovery API', () => {
  it('does not accept a session cookie or an incorrect operator token', async () => {
    const response = await handleOperationsRequest(
      request('wrong', {
        action: 'snapshot',
        workspaceId: crypto.randomUUID(),
      }),
      { ...env, OPERATIONS_TOKEN: 'operator-token' },
    );
    expect(response.status).toBe(404);
  });

  it('requires maintenance mode before changing a recovery point', async () => {
    const response = await handleOperationsRequest(
      request('operator-token', {
        action: 'prepare-restore',
        bookmark: 'bookmark',
        workspaceId: crypto.randomUUID(),
      }),
      { ...env, OPERATIONS_TOKEN: 'operator-token' },
    );
    expect(response.status).toBe(409);
  });

  it('restricts drill writes to isolated drill objects', async () => {
    const response = await handleOperationsRequest(
      request('operator-token', {
        action: 'write-drill-marker',
        marker: 'test',
        workspaceId: crypto.randomUUID(),
      }),
      { ...env, OPERATIONS_TOKEN: 'operator-token' },
    );
    expect(response.status).toBe(400);
  });
});
