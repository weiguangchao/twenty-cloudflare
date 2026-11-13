import {
  type UserRow,
  type UserWorkspaceRow,
  type WorkspaceRow,
} from '@/core-db/types/core-rows.type';

export class CoreStore {
  constructor(readonly database: D1Database) {}

  userById(id: string) {
    return this.database
      .prepare('SELECT * FROM "user" WHERE "id" = ?')
      .bind(id)
      .first<UserRow>();
  }

  userByEmail(email: string) {
    return this.database
      .prepare('SELECT * FROM "user" WHERE "email" = ?')
      .bind(email)
      .first<UserRow>();
  }

  workspaceById(id: string) {
    return this.database
      .prepare('SELECT * FROM "workspace" WHERE "id" = ?')
      .bind(id)
      .first<WorkspaceRow>();
  }

  workspaceByOrigin(origin: string) {
    return this.database
      .prepare('SELECT * FROM "workspace" WHERE "origin" = ?')
      .bind(origin)
      .first<WorkspaceRow>();
  }

  membership(userId: string, workspaceId: string) {
    return this.database
      .prepare(
        'SELECT * FROM "userWorkspace" WHERE "userId" = ? AND "workspaceId" = ?',
      )
      .bind(userId, workspaceId)
      .first<UserWorkspaceRow>();
  }

  async workspacesForUser(userId: string) {
    return (
      await this.database
        .prepare(
          'SELECT "workspace".* FROM "workspace" JOIN "userWorkspace" ON "workspace"."id" = "userWorkspace"."workspaceId" WHERE "userWorkspace"."userId" = ? ORDER BY "workspace"."createdAt", "workspace"."id"',
        )
        .bind(userId)
        .all<WorkspaceRow>()
    ).results;
  }
}
