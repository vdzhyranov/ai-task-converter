# Research: Claude Repository Integration

**Date**: 2025-11-07
**Feature**: Claude Repository Integration
**Purpose**: Research technical decisions and best practices for repository-aware AI assistance

## Research Topics

### 1. Repository Platform API Client Selection

**Question**: Which API client library should we use for accessing private repositories?

**Decision**: **@octokit/rest** (GitHub) as primary platform

**Rationale**:
- **Market dominance**: GitHub is the most widely used platform (>100M developers)
- **Mature ecosystem**: @octokit/rest is official GitHub SDK, well-maintained
- **TypeScript native**: First-class TypeScript support with full type definitions
- **Existing adoption**: 15K+ stars, used by GitHub CLI and major tools
- **Authentication**: Supports PAT, OAuth Apps, GitHub Apps
- **Rate limits**: 5,000 req/hour authenticated (vs 60 unauth)
- **Tree API**: Efficient recursive file retrieval via Git Trees API
- **Content API**: Base64 encoded file content with metadata

**Alternatives considered**:
- **@gitbeaker/node** (GitLab): Excellent library, but GitLab has smaller market share. Can add later if needed.
- **Simple REST calls**: More flexible but loses type safety and error handling
- **git CLI**: Too heavyweight, requires file system access, harder to secure

**Implementation approach**:
- Start with GitHub support only (YAGNI)
- Design repository.service with platform abstraction
- Add GitLab/Bitbucket support only if requested (Rule of Three)

---

### 2. Context Detection Strategy

**Question**: How should we automatically determine which files are relevant for a feature request?

**Decision**: **Hybrid keyword + pattern matching** for MVP

**Rationale**:
- **Simplicity**: Keyword extraction from feature description + directory heuristics
- **Performance**: No ML models needed, fast execution
- **Accuracy**: Good enough for v1 based on industry patterns

**Strategy components**:

1. **Keyword extraction**:
   - Extract technology terms (React, Prisma, NestJS, etc.)
   - Extract entity names (User, Task, Conversation, etc.)
   - Extract action verbs (create, update, delete, list, etc.)

2. **Directory prioritization**:
   - `src/modules/` - highest priority for backend changes
   - `src/components/` - highest priority for frontend changes
   - `prisma/schema.prisma` - always include for data models
   - `package.json` - always include for dependencies
   - `README.md`, `docs/` - include for understanding project

3. **File type filtering**:
   - Include: `.ts`, `.tsx`, `.prisma`, `.json`, `.md`
   - Exclude: `.test.ts`, `.spec.ts`, `node_modules/`, `dist/`, `.git/`

4. **Context size limits**:
   - Claude API context window: 200K tokens (Claude 3)
   - Target: 50-100 files max, ~50K tokens
   - Prioritize by: relevance score, last modified date

**Alternatives considered**:
- **Vector embeddings + semantic search**: Too complex for MVP, adds ML dependencies
- **Manual file selection**: User selected against this (chose automatic)
- **Include entire repo**: Hits token limits, slow, expensive

---

### 3. Sensitive Data Filtering

**Question**: How do we prevent leaking secrets to Claude API?

**Decision**: **Multi-layer regex + pattern detection**

**Rationale**:
- **Security-critical**: Zero tolerance for credential leakage (SC-006)
- **Defense in depth**: Multiple detection layers
- **Industry standard patterns**: Well-known secret formats

**Implementation layers**:

1. **File exclusion** (first layer):
   - `.env`, `.env.*` files
   - `credentials.json`, `secrets.json`
   - `.pem`, `.key`, `.cert` files
   - Respect `.gitignore` patterns

2. **Content pattern detection** (second layer):
   - API keys: `(api[_-]?key|apikey)[\s:=]+['\"]?([a-zA-Z0-9_-]+)['\"]?`
   - Tokens: `(token|bearer|auth)[\s:=]+['\"]?([a-zA-Z0-9._-]+)['\"]?`
   - AWS credentials: `AWS[A-Z0-9]{16}`
   - Private keys: `-----BEGIN (RSA |)PRIVATE KEY-----`
   - Connection strings: `postgres://`, `mongodb://` with credentials

3. **Redaction strategy**:
   - Replace matched patterns with `[REDACTED:API_KEY]`
   - Log redactions for audit (count, not values)
   - Warn user if many redactions (might indicate misconfiguration)

**Libraries to use**:
- No new dependencies needed, use built-in RegExp
- Consider `detect-secrets` patterns as reference (Python tool, adapt patterns)

---

### 4. Repository Content Caching

**Question**: How should we cache repository content for performance?

**Decision**: **Database-backed cache with TTL + webhook invalidation**

**Rationale**:
- **Performance**: Avoids repeated GitHub API calls
- **Cost**: Reduces API rate limit consumption
- **Freshness**: Webhooks ensure updates detected
- **Simplicity**: Prisma already in use, no new infrastructure

**Caching strategy**:

1. **Cache key structure**:
   ```
   repo:{owner}/{name}:branch:{branch}:path:{path}:sha:{commit_sha}
   ```

2. **Storage**:
   - Store in PostgreSQL via Prisma
   - Cache entity: `{ repository, path, content, sha, cachedAt, expiresAt }`
   - Index on `(repository, path, sha)` for fast lookup

3. **TTL policy**:
   - Default TTL: 1 hour for file content
   - Repository structure (tree): 5 minutes
   - Commit SHAs: Cache key includes SHA (immutable)

4. **Invalidation**:
   - Time-based: Auto-expire after TTL
   - Manual: API endpoint to clear cache for repo
   - Webhook: GitHub push event → clear cache for affected paths
   - LRU eviction: Keep last 10,000 entries

5. **Cache warming**:
   - On first request: Fetch + cache
   - Background: Pre-fetch common paths (schema.prisma, package.json)

**Alternatives considered**:
- **Redis**: More infrastructure, overkill for MVP
- **In-memory**: Lost on restart, doesn't scale horizontally
- **No caching**: Too slow, hits rate limits

---

### 5. Claude API Context Optimization

**Question**: How should we structure repository context for Claude?

**Decision**: **Hierarchical summary + focused details**

**Rationale**:
- **Token efficiency**: Avoid sending entire files unnecessarily
- **Comprehension**: Claude needs structure to understand codebase
- **Relevance**: More detail for relevant files, summaries for others

**Context structure**:

```markdown
# Repository Context: {owner}/{repo}

## Project Overview
- Tech stack: [from package.json]
- Structure: [directory tree]
- Database: [from schema.prisma summary]

## Relevant Files ({count} files)

### {file_path}
```{language}
{file_content}
```

## Related Files (summaries)
- {file_path}: {first 5 lines + last 5 lines}
```

**Prompt engineering**:
- Prepend context before user's feature request
- Use XML-style tags for Claude to parse
- Include line numbers for reference
- Highlight patterns Claude should follow

**Token budget allocation**:
- System prompt: ~1K tokens
- Repository context: ~40K tokens
- User request: ~5K tokens
- Response: ~10K tokens
- Total: ~56K / 200K available

---

### 6. Error Handling & Rate Limiting

**Question**: How do we handle GitHub API rate limits gracefully?

**Decision**: **Exponential backoff + user feedback**

**Rationale**:
- **Reliability**: Temporary failures shouldn't break UX
- **Transparency**: Users should know why delays occur
- **Compliance**: Respect platform limits

**Implementation**:

1. **Rate limit detection**:
   - Check `X-RateLimit-Remaining` header
   - Pre-emptive throttling if <100 remaining
   - Detect 429 status codes

2. **Backoff strategy**:
   - First retry: 1 second
   - Second retry: 2 seconds
   - Third retry: 4 seconds
   - Max retries: 5

3. **User feedback**:
   - Show progress: "Retrieving repository content..."
   - On delay: "GitHub rate limit approaching, request queued"
   - On failure: "Unable to access repository. Please check credentials."

4. **Graceful degradation**:
   - If repo unavailable: Continue without context, warn user
   - If partial failure: Use cached data, note staleness

---

## Summary of Decisions

| Topic | Decision | Implementation Priority |
|-------|----------|------------------------|
| Repository platform | GitHub via @octokit/rest | P1 (MVP) |
| Context detection | Keyword + pattern matching | P1 (MVP) |
| Sensitive data filtering | Multi-layer regex | P1 (Security-critical) |
| Caching strategy | PostgreSQL + TTL | P1 (Performance) |
| Claude context format | Hierarchical summary | P1 (MVP) |
| Error handling | Exponential backoff | P2 (Polish) |
| GitLab support | @gitbeaker/node | P3 (Future) |

**Next steps**: Proceed to Phase 1 (data-model.md, contracts, quickstart.md)
