# Tasks: DevInsight Agent - AI-Powered Feature to Task Converter

**Feature Branch**: `001-ai-task-converter`
**Input**: Design documents from `/specs/001-ai-task-converter/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, quickstart.md

**MVP Scope**: User Stories P1-P2 only (2-day timeline)
**Deferred**: User Stories P3-P4 (post-MVP)

**Tests**: Optional - not explicitly requested in spec.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Includes exact file paths

---

## Phase 1: Setup (Monorepo Infrastructure)

**Purpose**: Initialize pnpm workspace + Turborepo monorepo structure

- [X] T001 Create pnpm-workspace.yaml with backend/ and frontend/ workspaces
- [X] T002 Create turbo.json with pipeline configuration (dev, build, db:migrate)
- [X] T003 Create root package.json with workspace scripts and shared dependencies
- [X] T004 Create docker-compose.yml for PostgreSQL 15.x/16.x development database
- [X] T005 [P] Create backend/package.json with NestJS 10.x, Prisma 5.x, @anthropic-ai/sdk ^0.27.0
- [X] T006 [P] Create frontend/package.json with Next.js 14.x, React 18.x, Tailwind 3.x, tRPC 10.x, shadcn/ui
- [X] T007 [P] Create backend/tsconfig.json with NestJS-compatible TypeScript configuration
- [X] T008 [P] Create frontend/tsconfig.json with Next.js-compatible TypeScript configuration
- [X] T009 [P] Create backend/nest-cli.json for NestJS CLI configuration
- [X] T010 [P] Create frontend/next.config.js for Next.js configuration
- [X] T011 [P] Create frontend/tailwind.config.ts with Tailwind CSS configuration
- [X] T012 [P] Create frontend/components.json for shadcn/ui configuration
- [X] T013 Create .gitignore for monorepo (node_modules, dist, .next, .env)
- [X] T014 Create .env.example files in backend/ and frontend/ with required environment variables
- [X] T015 [P] Install all dependencies with pnpm install from repository root

**Checkpoint**: Monorepo structure initialized, dependencies installed

---

## Phase 2: Foundational (Blocking Prerequisites for ALL User Stories)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Schema

- [ ] T016 Create backend/src/prisma/schema.prisma with Conversation, ConversationMessage, Task models and enums (Department, ConversationStatus, MessageRole, MessageType)
- [ ] T017 Run pnpm --filter backend db:generate to generate Prisma Client
- [ ] T018 Run pnpm --filter backend db:migrate --name init to create initial migration
- [ ] T019 Verify database schema created with docker exec -it devinsight-postgres psql

### Backend Foundation

- [ ] T020 Create backend/src/main.ts with NestJS bootstrap, CORS, global pipes
- [ ] T021 Create backend/src/app.module.ts importing Prisma, AI, Conversations, Tasks modules
- [ ] T022 Create backend/src/config/configuration.ts for environment variable management (DATABASE_URL, ANTHROPIC_API_KEY, PORT)
- [ ] T023 [P] Create backend/src/modules/prisma/prisma.module.ts and prisma.service.ts
- [ ] T024 [P] Create backend/src/common/filters/http-exception.filter.ts for global error handling
- [ ] T025 [P] Create backend/src/common/interceptors/logging.interceptor.ts for request/response logging

### Frontend Foundation

- [ ] T026 Create frontend/src/app/layout.tsx with root layout and TRPCProvider
- [ ] T027 Create frontend/src/app/page.tsx placeholder (will be replaced in US1)
- [ ] T028 Create frontend/src/lib/trpc.ts with tRPC client configuration
- [ ] T029 Create frontend/src/lib/utils.ts with Tailwind cn() helper
- [ ] T030 Create frontend/src/styles/globals.css with Tailwind imports
- [ ] T031 [P] Install shadcn/ui base components: npx shadcn-ui@latest init
- [ ] T032 [P] Add shadcn/ui components: button, card, textarea, input, badge, separator

### tRPC Router Setup

- [ ] T033 Create backend/src/modules/trpc/trpc.ts with router and publicProcedure setup
- [ ] T034 Create backend/src/modules/trpc/context.ts with Prisma injection
- [ ] T035 Create backend/src/modules/trpc/routers/conversations.router.ts (stub with empty procedures)
- [ ] T036 Create backend/src/modules/trpc/routers/tasks.router.ts (stub with empty procedures)
- [ ] T037 Create backend/src/modules/trpc/router.ts combining conversations and tasks routers
- [ ] T038 Create backend/src/modules/trpc/trpc.controller.ts to expose tRPC via HTTP
- [ ] T039 Create backend/src/modules/trpc/trpc.module.ts and register in app.module.ts

**Checkpoint**: Foundation ready - database configured, backend/frontend scaffolded, tRPC wired up

---

## Phase 3: User Story 1 - Multi-Turn Conversation & Task Generation (Priority: P1) 🎯 MVP

**Goal**: Product manager describes a feature, answers 3-5 AI-generated questions, approves requirements, and receives department-organized tasks

**Independent Test**: Submit feature description via chat interface, answer AI questions, approve requirements, verify structured tasks displayed

### Backend: AI Service (Claude Integration)

- [ ] T040 [US1] Create backend/src/modules/ai/ai.module.ts
- [ ] T041 [US1] Create backend/src/modules/ai/ai.service.ts with Anthropic SDK client initialization
- [ ] T042 [US1] Implement generateClarifyingQuestion(featureDescription, previousMessages, questionCount) in ai.service.ts
- [ ] T043 [US1] Implement generateRequirementsSummary(featureDescription, messages) in ai.service.ts
- [ ] T044 [US1] Implement generateTasks(requirementsSummary) in ai.service.ts returning tasks by department
- [ ] T045 [US1] Create backend/src/modules/ai/prompts/question-generation.prompt.ts with system prompt for asking questions
- [ ] T046 [US1] Create backend/src/modules/ai/prompts/requirements-summary.prompt.ts with system prompt for summarizing requirements
- [ ] T047 [US1] Create backend/src/modules/ai/prompts/task-generation.prompt.ts with system prompt for generating department tasks

### Backend: Conversations Service (State Machine)

- [ ] T048 [US1] Create backend/src/modules/conversations/conversations.module.ts importing Prisma and AI modules
- [ ] T049 [US1] Create backend/src/modules/conversations/dto/create-conversation.dto.ts with Zod schema (featureDescription: string min 10 max 10000)
- [ ] T050 [US1] Create backend/src/modules/conversations/dto/answer-question.dto.ts with Zod schema (conversationId: uuid, answer: string min 1 max 10000)
- [ ] T051 [US1] Create backend/src/modules/conversations/dto/approve-requirements.dto.ts with Zod schema (conversationId: uuid)
- [ ] T052 [US1] Create backend/src/modules/conversations/dto/reject-requirements.dto.ts with Zod schema (conversationId: uuid, reason?: string max 1000)
- [ ] T053 [US1] Create backend/src/modules/conversations/conversations.service.ts
- [ ] T054 [US1] Implement create(featureDescription) in conversations.service.ts: create Conversation (status: ASKING_QUESTIONS), save user message, generate first question, save question message, return conversationId + question
- [ ] T055 [US1] Implement answerQuestion(conversationId, answer) in conversations.service.ts: save answer message, check questionCount < 5 && need more clarity → generate next question OR generate requirements summary, update status accordingly
- [ ] T056 [US1] Implement approveRequirements(conversationId) in conversations.service.ts: validate status = AWAITING_APPROVAL, update status to GENERATING_TASKS, call TasksService.generateTasks(), save approval message, update status to COMPLETED
- [ ] T057 [US1] Implement rejectRequirements(conversationId, reason?) in conversations.service.ts: validate status = AWAITING_APPROVAL, save rejection message, update status to ASKING_QUESTIONS, generate new question
- [ ] T058 [US1] Implement getConversationDetail(conversationId) in conversations.service.ts: return Conversation with messages (ordered) and tasks

### Backend: Tasks Service

- [ ] T059 [US1] Create backend/src/modules/tasks/tasks.module.ts importing Prisma and AI modules
- [ ] T060 [US1] Create backend/src/modules/tasks/dto/task.dto.ts with Task response schema
- [ ] T061 [US1] Create backend/src/modules/tasks/tasks.service.ts
- [ ] T062 [US1] Implement generateTasks(conversationId) in tasks.service.ts: call AI service to generate tasks, create Task records (bulk insert), update Conversation.generatedTasks (JSONB), return tasks grouped by department
- [ ] T063 [US1] Add error handling for AI service failures (timeout, API errors) → update Conversation.status to FAILED

### Backend: tRPC Procedures Implementation

- [ ] T064 [US1] Implement conversations.create procedure in conversations.router.ts calling ConversationsService.create()
- [ ] T065 [US1] Implement conversations.answer procedure in conversations.router.ts calling ConversationsService.answerQuestion()
- [ ] T066 [US1] Implement conversations.approve procedure in conversations.router.ts calling ConversationsService.approveRequirements()
- [ ] T067 [US1] Implement conversations.reject procedure in conversations.router.ts calling ConversationsService.rejectRequirements()
- [ ] T068 [US1] Implement conversations.get procedure in conversations.router.ts calling ConversationsService.getConversationDetail()

### Frontend: Chat Interface Components

- [ ] T069 [P] [US1] Create frontend/src/components/ui/ components using shadcn/ui: button, card, textarea, input, badge, separator (if not already added in T032)
- [ ] T070 [US1] Create frontend/src/components/chat/chat-container.tsx with conversation state management (conversationId, status, messages)
- [ ] T071 [US1] Create frontend/src/components/chat/chat-input.tsx with textarea and submit button for feature description and answers
- [ ] T072 [US1] Create frontend/src/components/chat/chat-message.tsx displaying message with role (USER/ASSISTANT/SYSTEM) and styling
- [ ] T073 [US1] Create frontend/src/components/chat/requirements-summary.tsx displaying requirements summary with approve/reject buttons
- [ ] T074 [US1] Create frontend/src/components/chat/task-result.tsx displaying generated tasks by department after approval

### Frontend: tRPC Integration

- [ ] T075 [US1] Implement trpc.conversations.create.useMutation in chat-container.tsx to submit feature description
- [ ] T076 [US1] Implement trpc.conversations.answer.useMutation in chat-container.tsx to answer questions
- [ ] T077 [US1] Implement trpc.conversations.approve.useMutation in requirements-summary.tsx to approve requirements
- [ ] T078 [US1] Implement trpc.conversations.reject.useMutation in requirements-summary.tsx to reject requirements
- [ ] T079 [US1] Handle loading states and error messages in chat-container.tsx (per FR-011, FR-012)
- [ ] T080 [US1] Implement auto-scroll to latest message in chat-container.tsx

### Frontend: Main Chat Page

- [ ] T081 [US1] Replace frontend/src/app/page.tsx with ChatContainer component as main chat interface
- [ ] T082 [US1] Add loading spinner during task generation (status: GENERATING_TASKS)
- [ ] T083 [US1] Add error handling for failed conversations (status: FAILED)
- [ ] T084 [US1] Add success state showing tasks after generation completes

**Checkpoint**: User Story 1 complete - chat interface functional, AI asks 3-5 questions, tasks generated and displayed

---

## Phase 4: User Story 2 - Task Dashboard (Priority: P2)

**Goal**: Product managers view generated tasks in a clean dashboard with department grouping and export functionality

**Independent Test**: Navigate to dashboard after task generation, verify tasks displayed by department, copy/export tasks

### Backend: Export Functionality

- [ ] T085 [US2] Create backend/src/modules/tasks/dto/export-tasks.dto.ts with Zod schema (conversationId: uuid, format: enum [markdown, json, text], department?: enum)
- [ ] T086 [US2] Implement exportTasks(conversationId, format, department?) in tasks.service.ts: retrieve tasks (optionally filtered by department), format as markdown/json/text, return content + filename
- [ ] T087 [US2] Create backend/src/modules/tasks/formatters/markdown.formatter.ts to format tasks as markdown with department headings
- [ ] T088 [US2] Create backend/src/modules/tasks/formatters/json.formatter.ts to format tasks as JSON with schema
- [ ] T089 [US2] Create backend/src/modules/tasks/formatters/text.formatter.ts to format tasks as plain text
- [ ] T090 [US2] Implement tasks.export procedure in tasks.router.ts calling TasksService.exportTasks()

### Frontend: Dashboard Components

- [ ] T091 [P] [US2] Create frontend/src/components/dashboard/task-card.tsx displaying task with description, acceptance criteria, and copy button
- [ ] T092 [P] [US2] Create frontend/src/components/dashboard/department-group.tsx grouping tasks by department with "Copy All" button
- [ ] T093 [P] [US2] Create frontend/src/components/dashboard/task-list.tsx displaying all department groups
- [ ] T094 [US2] Create frontend/src/components/dashboard/export-button.tsx with dropdown for format selection (markdown, json, text)

### Frontend: Dashboard Page

- [ ] T095 [US2] Create frontend/src/app/dashboard/page.tsx with TaskList component
- [ ] T096 [US2] Implement trpc.conversations.get.useQuery to fetch conversation details with tasks
- [ ] T097 [US2] Group tasks by department (DESIGN, FRONTEND, BACKEND) in dashboard page
- [ ] T098 [US2] Implement copy to clipboard for individual task in task-card.tsx (per FR-006)
- [ ] T099 [US2] Implement copy all tasks for department in department-group.tsx (per FR-007)
- [ ] T100 [US2] Implement trpc.tasks.export.useQuery in export-button.tsx to download tasks in selected format (per FR-014)
- [ ] T101 [US2] Add navigation link from chat interface to dashboard after task generation completes
- [ ] T102 [US2] Add loading state while fetching conversation details
- [ ] T103 [US2] Add empty state when no tasks found

**Checkpoint**: User Story 2 complete - dashboard displays tasks by department, copy/export functional

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T104 [P] Add input validation error messages throughout chat interface (per FR-012)
- [ ] T105 [P] Add loading feedback messages "Analyzing your request...", "Generating tasks..." (per FR-011)
- [ ] T106 [P] Preserve conversation session on page refresh using localStorage or session storage (per FR-013)
- [ ] T107 [P] Add responsive design adjustments for desktop/laptop focus (mobile not required per assumptions)
- [ ] T108 Test end-to-end flow: feature description → 3-5 questions → requirements approval → task generation → dashboard view
- [ ] T109 Test edge cases: empty description, extremely long description (>2000 words), AI service unavailable
- [ ] T110 Test concurrent users (minimum 10 per SC-007) with load testing tool
- [ ] T111 Validate task generation time <30 seconds (per FR-002, SC-003)
- [ ] T112 Validate frontend bundle size <500KB (per constitution, estimated 150-250KB)
- [ ] T113 Validate API response times <200ms (per constitution)
- [ ] T114 Update CLAUDE.md with implementation notes and architecture decisions
- [ ] T115 Validate quickstart.md instructions work end-to-end on clean environment
- [ ] T116 [P] Code cleanup and refactoring for clarity
- [ ] T117 [P] Add JSDoc comments to all public API methods

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion - **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion - no dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion - integrates with US1 but independently testable
- **Polish (Phase 5)**: Depends on Phase 3 and Phase 4 completion

### User Story Independence

- **US1 (P1)**: Can start immediately after Phase 2 - fully independent
- **US2 (P2)**: Can start immediately after Phase 2 - references conversation/tasks from US1 but independently testable

### Within Each User Story

**US1 Task Dependencies**:
- T040-T047 (AI Service) → T053-T058 (Conversations Service) → T064-T068 (tRPC procedures)
- T059-T063 (Tasks Service) → T056 (approveRequirements uses TasksService)
- T069-T074 (Frontend components) → T075-T080 (tRPC integration) → T081-T084 (Main page)

**US2 Task Dependencies**:
- T085-T090 (Backend export) → T094, T100 (Frontend export button)
- T091-T093 (Dashboard components) → T095-T103 (Dashboard page)

### Parallel Opportunities

**Phase 1 (Setup)**:
- T005, T006, T007, T008, T009, T010, T011, T012 can run in parallel (different files)

**Phase 2 (Foundational)**:
- After database setup (T016-T019):
  - T023, T024, T025 can run in parallel (different backend modules)
  - T031, T032 can run in parallel (frontend component installation)

**Phase 3 (US1)**:
- T040-T047 (AI Service components) can be worked on in parallel
- T049-T052 (DTOs) can be created in parallel
- T069 and T070-T074 (frontend components) can be worked on by different developers

**Phase 4 (US2)**:
- T087, T088, T089 (formatters) can be written in parallel
- T091, T092, T093, T094 (dashboard components) can be worked on in parallel

**Phase 5 (Polish)**:
- T104, T105, T106, T107, T114, T116, T117 can be worked on in parallel (different concerns)

---

## Parallel Example: Phase 3 (User Story 1)

```bash
# AI Service components (parallel):
Task T040: "Create backend/src/modules/ai/ai.module.ts"
Task T045: "Create question-generation.prompt.ts"
Task T046: "Create requirements-summary.prompt.ts"
Task T047: "Create task-generation.prompt.ts"

# Conversations DTOs (parallel):
Task T049: "Create create-conversation.dto.ts"
Task T050: "Create answer-question.dto.ts"
Task T051: "Create approve-requirements.dto.ts"
Task T052: "Create reject-requirements.dto.ts"

# Frontend components (parallel):
Task T070: "Create chat-container.tsx"
Task T071: "Create chat-input.tsx"
Task T072: "Create chat-message.tsx"
Task T073: "Create requirements-summary.tsx"
Task T074: "Create task-result.tsx"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete **Phase 1: Setup** (monorepo infrastructure)
2. Complete **Phase 2: Foundational** (CRITICAL - blocks all stories)
3. Complete **Phase 3: User Story 1** (multi-turn conversation + task generation)
4. **STOP and VALIDATE**: Test US1 independently - feature description → questions → approval → tasks
5. Complete **Phase 4: User Story 2** (dashboard with export)
6. **STOP and VALIDATE**: Test US2 independently - view tasks, copy, export
7. Complete **Phase 5: Polish** (cross-cutting improvements)
8. **FINAL VALIDATION**: Run all edge cases, performance tests, quickstart validation

### Incremental Delivery

1. **Foundation Ready** (Phase 1 + 2) → Monorepo + database + tRPC scaffolded
2. **MVP Core** (+ Phase 3) → Chat interface functional, AI conversation working, tasks generated
3. **MVP Complete** (+ Phase 4) → Dashboard added, tasks viewable/exportable
4. **Production Ready** (+ Phase 5) → Polished, tested, documented

### Parallel Team Strategy

With 3 developers after Phase 2 completion:
- **Developer A**: Phase 3 backend (AI service + Conversations service + Tasks service)
- **Developer B**: Phase 3 frontend (chat components + tRPC integration)
- **Developer C**: Phase 4 (backend export + dashboard components)

Stories integrate at checkpoints after independent validation.

---

## Notes

- **[P] tasks**: Different files, no dependencies within phase - can run in parallel
- **[Story] labels**: Map tasks to user stories (US1, US2) for traceability
- **MVP scope**: P1-P2 only (US1-US2) - P3-P4 (US3-US4) deferred to post-MVP
- **Tests**: Optional - not explicitly requested in spec.md, excluded from task list
- **Commit frequency**: Commit after each task or logical group (e.g., T040-T047 as "AI Service")
- **Validation checkpoints**: Stop at each checkpoint to validate story independently
- **Performance targets**:
  - Task generation <30 seconds (FR-002)
  - API responses <200ms (constitution)
  - Frontend bundle <500KB (constitution, estimated 150-250KB)
- **2-Day timeline**: Aggressive MVP timeline requires efficient parallel execution