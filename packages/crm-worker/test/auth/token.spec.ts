import { describe, expect, it } from 'vitest';

import { signToken, verifyToken, type TokenType } from '@/auth/token.service';

const SECRET = 'test-signing-secret';

describe('purpose-bound tokens', () => {
  it.each<TokenType>(['login', 'access', 'refresh', 'file', 'file-upload'])(
    'round trips %s with subject, scope and expiry',
    async (type) => {
      const token = await signToken(
        SECRET,
        type,
        { sub: 'user-id', workspaceId: 'workspace-id', fileId: 'file-id' },
        900,
      );
      const claims = await verifyToken(SECRET, type, token.token);
      expect(claims).toMatchObject({
        sub: 'user-id',
        workspaceId: 'workspace-id',
        fileId: 'file-id',
        type,
      });
      expect(claims.exp - claims.iat).toBe(900);
      expect(token.expiresAt).toBe(new Date(claims.exp * 1000).toISOString());
    },
  );

  it('rejects a wrong key, purpose substitution, tampering, expired and malformed tokens', async () => {
    const token = (
      await signToken(SECRET, 'file', { sub: 'user-id', fileId: 'file-id' }, 60)
    ).token;
    const expired = (await signToken(SECRET, 'file', { sub: 'user-id' }, -1))
      .token;
    const [header, payload, signature] = token.split('.');
    for (const invalid of [
      expired,
      'invalid',
      `${header}.${payload}.invalid`,
      `${header}.${btoa('{}')}.${signature}`,
      token + '.extra',
    ]) {
      await expect(verifyToken(SECRET, 'file', invalid)).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    await expect(verifyToken('wrong-key', 'file', token)).rejects.toThrow(
      'Invalid or expired token',
    );
    await expect(verifyToken(SECRET, 'file-upload', token)).rejects.toThrow(
      'Invalid or expired token',
    );
    await expect(verifyToken(SECRET, 'access', token)).rejects.toThrow(
      'Invalid or expired token',
    );
  });
});
