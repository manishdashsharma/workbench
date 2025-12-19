/*
  Warnings:

  - The `status` column on the `tasks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `companyId` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTime` to the `tasks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `tasks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'REVIEWED');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_sequence_key" ON "companies"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- Insert default company for existing users
INSERT INTO "companies" ("id", "code", "name", "createdAt", "updatedAt")
VALUES (
  'default-company-id',
  'COMP-01',
  'Default Company',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- AlterTable projects - Add companyId column with default value first
ALTER TABLE "projects" ADD COLUMN "companyId" TEXT;
UPDATE "projects" SET "companyId" = 'default-company-id' WHERE "companyId" IS NULL;
ALTER TABLE "projects" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable users - Add companyId column with default value first
ALTER TABLE "users" ADD COLUMN "companyId" TEXT;
UPDATE "users" SET "companyId" = 'default-company-id' WHERE "companyId" IS NULL;
ALTER TABLE "users" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable tasks - Add new columns with defaults where needed
ALTER TABLE "tasks" ADD COLUMN "actualCompletedTime" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN "actualStartTime" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN "isCarriedForward" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tasks" ADD COLUMN "originalDueDate" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN "reviewedById" TEXT;

-- Add startTime and endTime with default values for existing tasks
ALTER TABLE "tasks" ADD COLUMN "startTime" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN "endTime" TIMESTAMP(3);
UPDATE "tasks" SET "startTime" = CURRENT_TIMESTAMP WHERE "startTime" IS NULL;
UPDATE "tasks" SET "endTime" = CURRENT_TIMESTAMP + INTERVAL '2 hours' WHERE "endTime" IS NULL;
ALTER TABLE "tasks" ALTER COLUMN "startTime" SET NOT NULL;
ALTER TABLE "tasks" ALTER COLUMN "endTime" SET NOT NULL;

-- Drop and recreate status column as TaskStatus enum
ALTER TABLE "tasks" DROP COLUMN "status";
ALTER TABLE "tasks" ADD COLUMN "status" "TaskStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "Status";

-- CreateIndex
CREATE INDEX "projects_companyId_idx" ON "projects"("companyId");

-- CreateIndex
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");

-- CreateIndex
CREATE INDEX "tasks_createdById_idx" ON "tasks"("createdById");

-- CreateIndex
CREATE INDEX "tasks_assignedToId_idx" ON "tasks"("assignedToId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_startTime_idx" ON "tasks"("startTime");

-- CreateIndex
CREATE INDEX "tasks_endTime_idx" ON "tasks"("endTime");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
