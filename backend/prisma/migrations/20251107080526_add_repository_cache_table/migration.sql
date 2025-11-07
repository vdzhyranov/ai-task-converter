-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "repositoryContextPaths" JSONB;

-- CreateTable
CREATE TABLE "RepositoryCache" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositoryCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepositoryCache_expiresAt_idx" ON "RepositoryCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepositoryCache_path_sha_key" ON "RepositoryCache"("path", "sha");
