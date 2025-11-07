# Tasks: Claude Repository Integration

**Input**: Design documents from `/specs/002-claude-repo-integration/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, research.md, quickstart.md

**Tests**: No test tasks included (not explicitly requested in specification)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/` at repository root
- **Paths shown** assume web app structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [x] T001 Install @octokit/rest dependency in backend/package.json
- [x] T002 [P] Add environment variables to .env.example file
- [x] T003 [P] Create backend/src/config/repository.config.ts for loading env vars

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add RepositoryCache model to backend/src/prisma/schema.prisma
- [x] T005 Add repositoryContextPaths field to Conversation model in backend/src/prisma/schema.prisma
- [x] T006 Generate Prisma client with pnpm --filter backend db:generate
- [ ] T007 Create database migration with pnpm --filter backend db:migrate (⚠️ Requires running database)

**Checkpoint**: Database schema ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Repository Context Access (Priority: P1) 🎯 MVP

**Goal**: Enable system to authenticate with GitHub and retrieve repository files with caching

**Independent Test**: Configure repository credentials, make API call to fetch file, verify file content returned and cached

### Implementation for User Story 1

- [x] T008 [P] [US1] Create backend/src/modules/repository/repository.module.ts
- [x] T009 [P] [US1] Create backend/src/modules/repository/clients/github.client.ts wrapping @octokit/rest
- [x] T010 [US1] Implement authentication and getFileContent method in github.client.ts
- [x] T011 [US1] Implement getFileTree method in github.client.ts for directory listing
- [x] T012 [US1] Create backend/src/modules/repository/repository.service.ts
- [x] T013 [US1] Implement cache lookup logic in repository.service.ts using Prisma
- [x] T014 [US1] Implement fetchAndCacheFile method in repository.service.ts
- [x] T015 [US1] Implement getBulkFiles method for batch fetching in repository.service.ts
- [x] T016 [P] [US1] Create backend/src/common/filters/sensitive-data.filter.ts
- [x] T017 [US1] Implement regex patterns for filtering secrets (API keys, tokens, credentials) in sensitive-data.filter.ts
- [x] T018 [US1] Integrate sensitive-data.filter into repository.service file caching
- [x] T019 [US1] Add error handling for authentication failures in github.client.ts
- [x] T020 [US1] Add error handling for rate limiting with exponential backoff in github.client.ts
- [x] T021 [US1] Export RepositoryModule and RepositoryService from repository.module.ts
- [x] T022 [US1] Import RepositoryModule in backend/src/app.module.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - system can fetch and cache repository files

---

## Phase 4: User Story 2 - Feature Request Submission (Priority: P2)

**Goal**: Enable Claude to receive repository context when generating tasks from feature requests

**Independent Test**: Submit a feature request, verify Claude receives relevant repository files as context, verify response references actual code

### Implementation for User Story 2

- [ ] T023 [P] [US2] Create backend/src/modules/repository/context-detector.service.ts
- [ ] T024 [US2] Implement keyword extraction from feature description in context-detector.service.ts
- [ ] T025 [US2] Implement directory prioritization logic (src/modules/, prisma/schema.prisma) in context-detector.service.ts
- [ ] T026 [US2] Implement file type filtering (.ts, .tsx, .prisma, .json) in context-detector.service.ts
- [ ] T027 [US2] Implement detectRelevantFiles method returning scored file list in context-detector.service.ts
- [ ] T028 [US2] Implement buildContext method that formats files for Claude in repository.service.ts
- [ ] T029 [US2] Add generateTasksWithContext method to backend/src/modules/ai/ai.service.ts
- [ ] T030 [US2] Inject RepositoryService into AiService constructor in ai.service.ts
- [ ] T031 [US2] Update generateTasksWithContext to call detectRelevantFiles in ai.service.ts
- [ ] T032 [US2] Update generateTasksWithContext to call buildContext and prepend to Claude prompt in ai.service.ts
- [ ] T033 [US2] Update backend/src/modules/tasks/tasks.service.ts to extract original feature description from conversation messages
- [ ] T034 [US2] Update tasks.service.ts generateTasks method to call ai.generateTasksWithContext instead of ai.generateTasks
- [ ] T035 [US2] Update tasks.service.ts to store repositoryContextPaths in Conversation after task generation
- [ ] T036 [US2] Update backend/src/modules/ai/prompts/task-generation.prompt.ts to mention repository context usage

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users receive context-aware task generation

---

## Phase 5: User Story 3 - Context-Aware Feature Analysis (Priority: P3)

**Goal**: Enhance context detection to identify existing patterns, dependencies, and architectural conventions

**Independent Test**: Submit feature request similar to existing feature, verify Claude identifies related files, suggests consistent patterns

### Implementation for User Story 3

- [ ] T037 [P] [US3] Add pattern matching logic to context-detector.service.ts (detect similar naming conventions)
- [ ] T038 [US3] Add dependency analysis from package.json parsing in context-detector.service.ts
- [ ] T039 [US3] Enhance detectRelevantFiles to include architectural pattern detection in context-detector.service.ts
- [ ] T040 [US3] Add similarity scoring for existing implementations in context-detector.service.ts
- [ ] T041 [US3] Update buildContext to include architectural notes section in repository.service.ts
- [ ] T042 [US3] Update buildContext to highlight existing patterns Claude should follow in repository.service.ts
- [ ] T043 [US3] Enhance task-generation.prompt.ts to instruct Claude to reference existing patterns

**Checkpoint**: All user stories now independently functional with progressive enhancement

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, performance optimization, monitoring

- [ ] T044 [P] Add cache TTL cleanup cron job (every 15 minutes) to remove expired entries
- [ ] T045 [P] Add cache statistics logging (hit rate, size) to repository.service.ts
- [ ] T046 [P] Add performance monitoring for GitHub API calls in github.client.ts
- [ ] T047 [P] Update quickstart.md with actual implementation notes and troubleshooting
- [ ] T048 [P] Add inline code documentation (JSDoc) to all new services
- [ ] T049 [P] Add validation for repository URL format in repository.config.ts
- [ ] T050 Add LRU eviction logic to keep cache under 10,000 entries in repository.service.ts
- [ ] T051 Run pnpm lint and fix any linting errors in new files
- [ ] T052 Run pnpm build and verify compilation succeeds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion AND User Story 1 (needs repository.service)
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion AND User Story 2 (enhances context detection)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅ MVP
- **User Story 2 (P2)**: Depends on User Story 1 (needs RepositoryService) - Cannot start until US1 complete
- **User Story 3 (P3)**: Depends on User Story 2 (enhances existing context detection) - Cannot start until US2 complete

### Within Each User Story

- T008-T009 (module files): Can run in parallel [P]
- T016 (sensitive filter): Can run in parallel with other US1 tasks [P]
- T023 (context detector): Can run in parallel within US2 [P]
- T037-T038 (enhancements): Can run in parallel within US3 [P]
- Most tasks depend on previous tasks in same story (e.g., T012 needs T009-T011 complete)

### Parallel Opportunities

- **Setup phase**: All 3 tasks can run in parallel
- **Foundational phase**: T004-T005 can run in parallel, then T006-T007 sequential
- **Within User Story 1**: T008-T009 parallel, T016 parallel with others
- **Within User Story 2**: T023 can start in parallel with T029
- **Within User Story 3**: T037-T038 can run in parallel
- **Polish phase**: T044-T048 can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch module structure setup together:
Task: "T008 [P] [US1] Create backend/src/modules/repository/repository.module.ts"
Task: "T009 [P] [US1] Create backend/src/modules/repository/clients/github.client.ts"

# Start sensitive filter in parallel while working on github client:
Task: "T016 [P] [US1] Create backend/src/common/filters/sensitive-data.filter.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007) **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 (T008-T022)
4. **STOP and VALIDATE**: Test repository authentication, file fetching, caching independently
5. Demo: Show file retrieval from GitHub with caching

### Incremental Delivery

1. **Foundation** (Setup + Foundational): Database ready, dependencies installed
2. **MVP** (+ User Story 1): Repository access working, caching functional
3. **Core Value** (+ User Story 2): Claude generates context-aware tasks
4. **Enhanced** (+ User Story 3): Pattern detection and architectural awareness
5. **Production** (+ Polish): Monitoring, optimization, documentation complete

### Sequential Implementation (Recommended)

Due to dependencies, recommended order:

1. Phase 1 (Setup) → Phase 2 (Foundational) **MUST COMPLETE FIRST**
2. Phase 3 (User Story 1) **COMPLETE BEFORE US2**
3. Phase 4 (User Story 2) **COMPLETE BEFORE US3**
4. Phase 5 (User Story 3)
5. Phase 6 (Polish)

**Rationale**: Each user story builds on the previous, making parallel development challenging. US2 needs US1's RepositoryService, US3 enhances US2's ContextDetectorService.

---

## Notes

- [P] tasks = different files or independent logic, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable after its phase completes
- Stop at any checkpoint to validate story independently
- All file paths are relative to repository root
- Environment variables must be configured before testing (see quickstart.md)
- No test files generated (tests not explicitly requested in spec)