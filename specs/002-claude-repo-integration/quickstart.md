# Quickstart: Claude Repository Integration

**Feature**: Claude Repository Integration
**Date**: 2025-11-07
**Audience**: Developers implementing this feature

## Overview

This feature enhances the existing AI task generator to include repository context in Claude's responses. Repository access is configured once at the application level via environment variables. No new user-facing APIs are added - the integration works transparently when users create conversations.

## Architecture

```
User submits feature request
   ↓
ConversationsService (existing)
   ↓
AiService.generateTasks() (extend existing)
   ↓
RepositoryService.getRelevantContext() (NEW)
   ↓
GitHub API → RepositoryCache (NEW)
   ↓
Context added to Claude prompt
   ↓
Claude API (@anthropic-ai/sdk, existing)
   ↓
Enhanced, project-aware tasks returned
```

## Environment Configuration

Add to `.env`:

```env
# Repository Integration
GITHUB_REPOSITORY_URL=https://github.com/your-org/your-repo
GITHUB_ACCESS_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
REPOSITORY_DEFAULT_BRANCH=main

# Optional: Cache settings
REPOSITORY_CACHE_TTL_MINUTES=60
REPOSITORY_MAX_CONTEXT_FILES=50
```

**Token generation**:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with scopes: `repo` (full control of private repositories)
3. Copy token to `.env`

## Implementation Steps

### Step 1: Database Migration

Add RepositoryCache table:

```bash
# Update schema.prisma with RepositoryCache model (see data-model.md)
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
```

### Step 2: Create Repository Module

**File**: `backend/src/modules/repository/repository.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RepositoryService } from './repository.service';
import { GithubClient } from './clients/github.client';
import { ContextDetectorService } from './context-detector.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [RepositoryService, GithubClient, ContextDetectorService],
  exports: [RepositoryService],
})
export class RepositoryModule {}
```

**Key services**:
- `GithubClient`: Wraps @octokit/rest for GitHub API calls
- `RepositoryService`: Main service - fetches files, manages cache
- `ContextDetectorService`: Detects relevant files from feature description

### Step 3: Extend AI Service

**File**: `backend/src/modules/ai/ai.service.ts`

Add repository context to prompts:

```typescript
// Add to constructor
constructor(
  private readonly configService: ConfigService,
  private readonly repositoryService: RepositoryService, // NEW
) { ... }

// New method
async generateTasksWithContext(
  requirementsSummary: string,
  featureDescription: string, // NEW: for context detection
): Promise<GeneratedTasks> {
  // 1. Detect relevant files
  const relevantFiles = await this.repositoryService.detectRelevantFiles(
    featureDescription
  );

  // 2. Build context string
  const repoContext = await this.repositoryService.buildContext(relevantFiles);

  // 3. Enhanced prompt with context
  const userMessage = `Repository Context:
${repoContext}

Requirements Summary:
${requirementsSummary}

Generate structured tasks considering the existing codebase patterns.`;

  // 4. Call Claude API (existing logic)
  const response = await this.client.messages.create({
    model: this.model,
    max_tokens: this.maxTokens,
    temperature: this.temperature,
    system: TASK_GENERATION_PROMPT, // Update to mention repo context
    messages: [{ role: 'user', content: userMessage }],
  });

  // 5. Parse and return (existing logic)
  ...
}
```

### Step 4: Update Tasks Service

**File**: `backend/src/modules/tasks/tasks.service.ts`

Pass feature description to AI service:

```typescript
async generateTasks(conversationId: string): Promise<TasksByDepartment> {
  const conversation = await this.prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  // ... existing validation ...

  // NEW: Get original feature description
  const messages = await this.prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { order: 'asc' },
  });
  const featureDescription = messages.find(m => m.role === 'USER')?.content || '';

  // Call AI service WITH repository context
  const generatedTasks = await this.aiService.generateTasksWithContext(
    conversation.requirementsSummary,
    featureDescription, // NEW
  );

  // Store context paths in conversation
  await this.prisma.conversation.update({
    where: { id: conversationId },
    data: {
      repositoryContextPaths: relevantFiles.map(f => f.path), // NEW
    },
  });

  // ... rest of existing logic ...
}
```

### Step 5: Update App Module

**File**: `backend/src/app.module.ts`

```typescript
import { RepositoryModule } from './modules/repository/repository.module';

@Module({
  imports: [
    // ... existing imports ...
    RepositoryModule, // NEW
  ],
})
export class AppModule {}
```

## Testing

### Manual Testing

1. **Verify repository access**:
```bash
# Add test endpoint (temporary)
curl http://localhost:3000/api/test-repo-access
# Should return: { "accessible": true, "repo": "owner/name" }
```

2. **Test context detection**:
```typescript
// In repository.service.spec.ts or via REPL
const files = await repositoryService.detectRelevantFiles(
  "Add user authentication with email and password"
);
// Should return relevant files like: auth.service.ts, user.model.ts, etc.
```

3. **Test full flow**:
   - Create conversation
   - Answer clarifying questions
   - Approve requirements
   - Generate tasks
   - Verify tasks reference existing codebase patterns

### Integration Testing

See existing test infrastructure - extend integration tests in `backend/test/integration/`.

## Monitoring

### Cache Performance

Check cache hit rate:
```sql
SELECT
  COUNT(*) as total_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits_per_entry
FROM repository_cache;
```

### Cache Cleanup

Add cron job to clean expired entries:
```typescript
// In a scheduled task service
@Cron('*/15 * * * *') // Every 15 minutes
async cleanExpiredCache() {
  await this.prisma.repositoryCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
```

## Troubleshooting

### "Repository not accessible"

- Verify `GITHUB_ACCESS_TOKEN` is correct
- Check token has `repo` scope
- Verify `GITHUB_REPOSITORY_URL` format

### "Rate limit exceeded"

- GitHub allows 5,000 req/hour authenticated
- Check cache is working (should reduce API calls)
- Increase `REPOSITORY_CACHE_TTL_MINUTES`

### "Context too large"

- Reduce `REPOSITORY_MAX_CONTEXT_FILES`
- Improve context detection filtering
- Check for large files being included

## Security Checklist

- [ ] Access token stored in `.env`, never committed
- [ ] Token has minimum required scopes (repo read only)
- [ ] Sensitive files filtered (.env, credentials.json, etc.)
- [ ] Content filtered for secret patterns before caching
- [ ] Cache properly invalidated on errors

## Next Steps

After implementation:
1. Run `/speckit.tasks` to generate detailed task list
2. Implement tasks in priority order (P1 → P2 → P3)
3. Test with real feature requests
4. Monitor cache performance and adjust TTL
5. Iterate on context detection algorithm based on results