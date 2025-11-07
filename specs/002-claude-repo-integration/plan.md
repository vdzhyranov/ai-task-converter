# Implementation Plan: Claude Repository Integration

**Branch**: `002-claude-repo-integration` | **Date**: 2025-11-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-claude-repo-integration/spec.md`

## Summary

Enhance the existing AI-powered task generator to access private repository context, enabling Claude to provide project-specific implementation guidance. The system will integrate repository platform APIs with the existing ai and tasks modules, automatically retrieving relevant codebase content to enrich Claude's responses with project-aware insights.

**Primary Components**:
- New repository module for GitHub/GitLab API integration
- Enhanced ai.service to accept repository context in prompts
- Context detection for intelligent file selection
- Caching layer for performance optimization
- Sensitive data filtering for security

## Technical Context

**Language/Version**: TypeScript 5.3+ with Node.js 18.x LTS
**Primary Dependencies**:
- NestJS 10.3 (existing backend framework)
- @anthropic-ai/sdk 0.27+ (existing Claude integration)
- Prisma 5.8 (existing database ORM)
- @trpc/server 10.45 (existing API layer)
- @octokit/rest ^20.0 (GitHub API client, new)

**Storage**: PostgreSQL via Prisma (extend existing schema for repo credentials/cache)
**Testing**: Jest 29.7 (skip test files for now, use existing test infrastructure)
**Target Platform**: Linux/macOS server (Node.js backend)
**Project Type**: Web application (extend existing backend + frontend)
**Performance Goals**:
- Repository context retrieval <5 seconds for repos <1,000 files
- Claude API response <30 seconds end-to-end (existing)
- Cache hit ratio >80% for repeated context requests
**Constraints**:
- API response times <200ms p95 (constitution requirement)
- Claude API rate limits (varies by plan)
- Repository platform rate limits (5,000 req/hour GitHub authenticated)
**Scale/Scope**:
- Support existing user base
- Handle repositories up to 100MB content
- Store repository context cache for performance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Simplicity First ✅ PASS

- **Reusing existing modules**: ai, tasks, conversations, prisma already implemented
- **No new frameworks**: Building on established NestJS + tRPC stack
- **Minimal new code**: Only adding repository module + extending ai.service
- **Justified additions**: Repository API client needed (no simpler way to access private repos)
- **YAGNI compliance**: Automatic context detection (user-selected simplest option)

### II. User-Centric Design ✅ PASS

- **User stories documented**: 3 prioritized stories (P1, P2, P3) with acceptance scenarios
- **Independent testability**: Each story delivers standalone value (P1=repo access, P2=enhanced tasks, P3=analysis)
- **Acceptance criteria**: Clear Given-When-Then scenarios in spec.md

### III. Web Application Standards ✅ PASS

- **Clear separation**: Backend (NestJS) handles repo/AI logic, frontend consumes via tRPC
- **Type-safe API**: Existing tRPC setup provides full type safety
- **Security**: FR-008 requires sensitive data filtering (OWASP A03:2021)
- **Performance**: <200ms p95 API responses, <30s Claude responses

### IV. Documentation as Code ✅ PASS

- **No new API contracts**: Internal module, no new public endpoints
- **Usage docs**: quickstart.md created (Phase 1 ✅)
- **Architecture decisions**: Documented in research.md (Phase 0 ✅)

### V. Continuous Integration ✅ PASS

- **Existing CI/CD**: Turbo monorepo with lint/test/build scripts
- **Quality gates**: ESLint, Prettier, Jest already configured

**GATE RESULT**: ✅ **PASS** - No violations. Reusing existing infrastructure.

## Project Structure

### Documentation (this feature)

```text
specs/002-claude-repo-integration/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (completed)
├── research.md          # Phase 0 output (completed)
├── data-model.md        # Phase 1 output (completed)
├── quickstart.md        # Phase 1 output (completed)
├── checklists/          # Quality validation
│   └── requirements.md  # Spec quality checklist (completed)
└── tasks.md             # /speckit.tasks output (next step)
```

### Source Code (extend existing structure)

**Structure Decision**: Web application - extending existing backend/frontend monorepo

```text
backend/
├── src/
│   ├── modules/
│   │   ├── repository/           # NEW MODULE (internal only)
│   │   │   ├── repository.module.ts
│   │   │   ├── repository.service.ts
│   │   │   ├── clients/
│   │   │   │   └── github.client.ts
│   │   │   └── context-detector.service.ts
│   │   ├── ai/                   # EXTEND EXISTING
│   │   │   ├── ai.service.ts     # UPDATE: add generateTasksWithContext()
│   │   │   └── prompts/
│   │   │       └── task-generation.prompt.ts # UPDATE: mention repo context
│   │   ├── tasks/                # EXTEND EXISTING
│   │   │   └── tasks.service.ts  # UPDATE: pass feature description to AI
│   │   ├── conversations/        # REUSE (no changes needed)
│   │   └── trpc/                 # REUSE (no new endpoints)
│   ├── common/
│   │   └── filters/
│   │       └── sensitive-data.filter.ts # NEW: filter secrets
│   ├── prisma/
│   │   ├── schema.prisma         # UPDATE: add RepositoryCache
│   │   └── migrations/           # NEW: migration files
│   └── config/
│       └── repository.config.ts  # NEW: env config loader
```

**Key Changes**:
- **NEW**: repository module (internal, used by ai.service)
- **EXTEND**: ai.service (add generateTasksWithContext method)
- **EXTEND**: tasks.service (pass feature description to AI)
- **EXTEND**: prisma schema (add RepositoryCache only, no credentials)
- **NO NEW APIs**: Repository integration works behind the scenes
- **REUSE**: All existing tRPC endpoints, conversations flow

## Complexity Tracking

> **No violations** - Constitution check passed. All changes extend existing modules.
