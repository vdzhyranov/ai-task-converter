# Data Model: Claude Repository Integration

**Feature**: Claude Repository Integration
**Date**: 2025-11-07
**Database**: PostgreSQL via Prisma ORM

## Overview

This feature adds minimal database entities to support caching repository content. Repository credentials are configured once at application startup via environment variables, not stored per-user.

## Configuration (Environment Variables)

Repository access is configured globally:

```env
GITHUB_REPOSITORY_URL=https://github.com/owner/repo
GITHUB_ACCESS_TOKEN=ghp_xxxxxxxxxxxxx
REPOSITORY_DEFAULT_BRANCH=main
```

**No database storage for credentials** - keeps it simple and secure.

---

## New Entities

### RepositoryCache

Caches repository file content and metadata to minimize API calls.

**Fields**:
- `id`: String (UUID, primary key)
- `path`: String (file path in repo, e.g., `src/app.module.ts`)
- `content`: String (file content, base64 if binary)
- `sha`: String (Git commit SHA for this content)
- `size`: Int (file size in bytes)
- `cachedAt`: DateTime (when cached)
- `expiresAt`: DateTime (TTL expiration)
- `hitCount`: Int (track cache usage, default 0)
- `lastAccessedAt`: DateTime

**Indexes**:
- `(path, sha)` (unique - fast lookup for specific version)
- `expiresAt` (for TTL cleanup)

**Cleanup**:
- Background job: Delete entries where `expiresAt < NOW()`
- LRU eviction: Keep 10,000 most recently accessed entries

---

## Updated Entities

### Conversation (Existing, minimal extension)

Add optional field to track which files were used as context:

**New Fields**:
- `repositoryContextPaths`: Json? (array of file paths included in this conversation's context)

**Purpose**:
- Audit which files Claude saw
- Reproduce conversation context
- Optional - can be null if no repo context used

---

## Prisma Schema Additions

```prisma
model RepositoryCache {
  id               String    @id @default(uuid())
  path             String
  content          String    @db.Text
  sha              String
  size             Int
  cachedAt         DateTime  @default(now())
  expiresAt        DateTime
  hitCount         Int       @default(0)
  lastAccessedAt   DateTime  @default(now())

  @@unique([path, sha])
  @@index([expiresAt])
  @@map("repository_cache")
}

// Update existing Conversation model
model Conversation {
  // ... existing fields ...
  repositoryContextPaths Json? // Array of file paths used in context
}
```

## Validation Rules

### RepositoryCache

1. **TTL policy**:
   - Default: `expiresAt = cachedAt + 1 hour`
   - Immutable content (by SHA): Same SHA = same content forever
   - Hot files (package.json, schema.prisma): 5 minute TTL

2. **Size limits**:
   - Max single file: 1MB
   - Reject binary files >100KB
   - Total cache: 50MB max (LRU eviction)

3. **Path validation**:
   - Must not start with `/`
   - Must not contain `..` (path traversal prevention)
   - Must not be in exclusion list (`.env`, `node_modules/`, etc.)

## State Transitions

### RepositoryCache

```
[API Fetch] → Create with cachedAt=NOW, expiresAt=NOW+TTL
   ↓
[Cache Hit] → hitCount++, lastAccessedAt=NOW
   ↓
[TTL Expired] → expiresAt < NOW
   ↓
[Cleanup Job] → DELETE
```

## Migration Strategy

1. **Generate migration**: Add RepositoryCache model
2. **Update Conversation**: Add nullable repositoryContextPaths field
3. **Deploy**: No data migration needed (new feature)

**Commands**:
```bash
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
```

## Performance Considerations

1. **Indexes**:
   - `(path, sha)` unique: Fast lookup + prevent duplicates
   - `expiresAt`: Efficient cleanup queries

2. **Query patterns**:
   - Batch lookups: `findMany({ where: { path: { in: paths } } })`
   - Cache warming: Pre-fetch common files on startup
   - TTL cleanup: Cron job every 15 minutes

3. **Target metrics**:
   - Cache hit rate: >80%
   - Average lookup time: <10ms
   - Cache memory usage: <50MB

## Security Notes

1. **Access token security**:
   - Stored in environment variable only
   - Never logged or exposed in API
   - Loaded once at application startup

2. **Content filtering**:
   - Never cache .env files
   - Filter out sensitive patterns before caching
   - Respect .gitignore patterns

3. **Audit**:
   - Log cache hit/miss rates
   - Track which files accessed most
   - Monitor cache size growth