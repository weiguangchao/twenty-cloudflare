ALTER TABLE "workspace" ADD COLUMN "trashRetentionDays" INTEGER NOT NULL DEFAULT 30 CHECK ("trashRetentionDays" BETWEEN 0 AND 3650);
ALTER TABLE "user" ADD COLUMN "deletedAt" TEXT;
