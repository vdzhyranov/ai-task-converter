# Technical Research: DevInsight Agent

**Feature**: 001-ai-task-converter
**Date**: 2025-11-06
**Purpose**: Resolve technical unknowns and establish implementation approach for 2-day MVP

## Research Questions

Based on Technical Context "NEEDS CLARIFICATION" items:
1. Web application stack (Language/Version)
2. AI/LLM integration approach (Primary Dependencies)
3. Session persistence mechanism (Storage)
4. Testing framework

## Decision 1: Web Application Stack

**Decision**: TypeScript full-stack with Next.js frontend + NestJS backend

**Rationale**:
- **TypeScript throughout**:
  - Type safety across entire stack reduces bugs
  - Shared types between frontend/backend
  - Better IDE support and refactoring
  - Industry standard for modern web applications

- **Next.js frontend**:
  - React-based with excellent DX
  - Built-in routing and code splitting
  - Server components can reduce bundle size
  - Tailwind integration out of the box
  - Meets <500KB bundle constraint easily

- **NestJS backend**:
  - TypeScript-first framework
  - Modular architecture supports clean separation
  - Built-in OpenAPI/Swagger support (Documentation as Code)
  - Dependency injection simplifies testing
  - Express-based, mature ecosystem

- **Tailwind CSS**:
  - Utility-first styling
  - Small production bundle (purges unused)
  - Rapid UI development for 2-day timeline
  - shadcn components built on Tailwind

- **shadcn/ui**:
  - High-quality, accessible components
  - Copy-paste approach (no npm bloat)
  - Built on Radix UI primitives
  - Perfect for chat interface and dashboard

- **tRPC**:
  - End-to-end type safety
  - No code generation needed
  - Simpler than REST for TypeScript full-stack
  - Excellent DX with autocomplete

**Implementation Details**:
- Node.js: 18.x or 20.x LTS
- TypeScript: 5.x
- Next.js: 14.x (App Router)
- NestJS: 10.x
- Tailwind CSS: 3.x
- tRPC: 10.x
- shadcn/ui: Latest (copy-paste components)

## Decision 2: AI/LLM Integration

**Decision**: Anthropic Claude API (Claude 3.5 Sonnet) via official TypeScript SDK

**Rationale**:
- **Claude 3.5 Sonnet**:
  - Excellent at structured task generation
  - Strong instruction following
  - JSON output formatting
  - 200K context window for large feature descriptions
  - Fast response times (<30s easily achievable)

- **Official TypeScript SDK**:
  - Native TypeScript support with full types
  - Async/await patterns
  - Streaming support (show progress to users)
  - Built-in retry logic and error handling
  - Well-maintained by Anthropic

- **Integration approach**:
  - NestJS service for Claude interactions
  - Prompt engineering for consistent task structure
  - Response parsing into typed Task objects
  - Streaming for real-time feedback

**Implementation Details**:
- Library: `@anthropic-ai/sdk` (^0.27.0)
- Model: `claude-3-5-sonnet-20241022`
- Max tokens: 4096
- Temperature: 0.3 (consistent but creative)
- System prompt: Engineered for department-specific task generation

**API Design** (tRPC procedures):
```typescript
generateTasks: publicProcedure
  .input(z.object({
    conversationId: z.string(),
    featureDescription: z.string(),
  }))
  .mutation(async ({ input }) => {
    // Returns structured tasks
  })
```

## Decision 3: Database & Session Persistence

**Decision**: PostgreSQL with Prisma ORM

**Rationale**:
- **PostgreSQL**:
  - Industry-standard relational database
  - Excellent TypeScript ecosystem
  - JSONB support for flexible task storage
  - Handles concurrent users well
  - Free tier available (Supabase, Neon, Railway)

- **Prisma ORM**:
  - TypeScript-first ORM
  - Type-safe database queries
  - Excellent DX with Prisma Studio
  - Migration system built-in
  - Auto-generated types from schema
  - Perfect match with NestJS

- **Session persistence**:
  - Store conversations in PostgreSQL
  - JSONB column for task structures
  - Enables P4 (conversation history) easily
  - Session-based for MVP, can add auth later

**Alternatives Considered**:
- **In-memory only**: Rejected - lose data on restart, doesn't support P4
- **Redis only**: Rejected - need relational structure for P4 history
- **MongoDB**: Rejected - PostgreSQL better for structured data + TypeScript

**Implementation Details**:
- PostgreSQL: 15.x or 16.x
- Prisma: 5.x
- Database schema:
  ```prisma
  model Conversation {
    id                String   @id @default(uuid())
    featureDescription String   @db.Text
    generatedTasks    Json?    // Structured task data
    assumptions       String[]
    status            ConversationStatus @default(IN_PROGRESS)
    createdAt         DateTime @default(now())
    updatedAt         DateTime @updatedAt
    tasks             Task[]
  }

  model Task {
    id                 String   @id @default(uuid())
    conversationId     String
    department         Department
    description        String   @db.Text
    acceptanceCriteria String[]
    priority           Int?
    createdAt          DateTime @default(now())
    conversation       Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

    @@index([conversationId])
    @@index([department])
  }

  enum Department {
    DESIGN
    FRONTEND
    BACKEND
  }

  enum ConversationStatus {
    IN_PROGRESS
    COMPLETED
    FAILED
  }
  ```

## Decision 4: Testing Framework

**Decision**: Jest (backend) + Vitest (frontend) - Optional for MVP

**Rationale**:
- **Jest for NestJS**:
  - Built-in NestJS testing support
  - Excellent mocking capabilities
  - TypeScript support out of box
  - Standard for NestJS applications

- **Vitest for Next.js**:
  - Vite-compatible (Next.js moving toward Turbopack)
  - Jest-compatible API
  - Faster than Jest
  - Better ESM support

- **Optional for MVP**:
  - Focus 2-day timeline on functionality
  - Manual testing for P1-P2
  - Add comprehensive tests post-MVP

**Implementation Details**:
- Jest: ^29.0.0 (NestJS backend)
- Vitest: ^1.0.0 (Next.js frontend)
- Testing Library for React components
- Supertest for API testing
- Coverage target (post-MVP): 80%

## Decision 5: Project Structure

**Decision**: Monorepo with frontend/ + backend/

**Rationale**:
- Shared TypeScript types between frontend/backend
- Single repository simplifies 2-day development
- tRPC benefits from monorepo structure
- Clear separation of concerns

**Structure**:
```
backend/
├── src/
│   ├── modules/
│   │   ├── tasks/              # Task generation module
│   │   │   ├── tasks.controller.ts
│   │   │   ├── tasks.service.ts
│   │   │   └── dto/
│   │   │       ├── generate-tasks.dto.ts
│   │   │       └── task.dto.ts
│   │   ├── conversations/      # Conversation management
│   │   │   ├── conversations.controller.ts
│   │   │   ├── conversations.service.ts
│   │   │   └── dto/
│   │   │       ├── create-conversation.dto.ts
│   │   │       └── update-conversation.dto.ts
│   │   └── ai/                 # Claude integration
│   │       ├── ai.service.ts
│   │       └── prompts/
│   │           └── task-generation.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── config/
│   │   └── configuration.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── e2e/
│   └── unit/
├── package.json
├── tsconfig.json
└── nest-cli.json

frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Landing/Chat page (P1)
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Dashboard page (P2)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── ...
│   │   ├── chat/               # P1: Chat interface
│   │   │   ├── chat-input.tsx
│   │   │   ├── chat-message.tsx
│   │   │   └── chat-container.tsx
│   │   └── dashboard/          # P2: Task dashboard
│   │       ├── task-card.tsx
│   │       ├── department-group.tsx
│   │       ├── task-list.tsx
│   │       └── export-button.tsx
│   ├── lib/
│   │   ├── trpc.ts             # tRPC client setup
│   │   └── utils.ts            # Tailwind cn() helper
│   ├── types/
│   │   └── tasks.ts            # Shared types
│   └── styles/
│       └── globals.css         # Tailwind imports
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── components.json             # shadcn config

shared/                         # Optional: shared types
└── types/
    └── index.ts
```

## Decision 6: API Design

**Decision**: REST API (with tRPC as typed wrapper)

**Rationale**:
- **REST for external compatibility**:
  - Standard HTTP endpoints
  - Can be documented with OpenAPI/Swagger
  - Future integration flexibility

- **tRPC for internal type safety**:
  - Frontend-backend communication
  - End-to-end type safety
  - No need for manual API client code
  - Faster development

- **Hybrid approach**:
  - NestJS exposes REST endpoints
  - tRPC procedures wrap NestJS services
  - Best of both worlds

**Endpoints** (REST):
```
POST   /api/conversations          # Create new conversation
PATCH  /api/conversations/:id      # Update conversation
GET    /api/conversations/:id      # Get conversation by ID
GET    /api/conversations          # List conversations (P4)
POST   /api/tasks/generate         # Generate tasks from feature
POST   /api/tasks/export           # Export tasks
```

**tRPC Procedures**:
```typescript
export const appRouter = router({
  conversations: conversationRouter,
  tasks: taskRouter,
});

const conversationRouter = router({
  create: publicProcedure
    .input(z.object({
      featureDescription: z.string().min(10),
    }))
    .mutation(async ({ input, ctx }) => {
      // Creates conversation, returns ID
      return { id: string, status: 'IN_PROGRESS' };
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['IN_PROGRESS', 'COMPLETED', 'FAILED']).optional(),
      generatedTasks: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Updates conversation
      return { id: string, updatedAt: Date };
    }),

  get: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      // Returns conversation with tasks
      return ConversationType;
    }),

  list: publicProcedure
    .query(async ({ ctx }) => {
      // Returns all conversations (P4 feature)
      return ConversationType[];
    }),
});

const taskRouter = router({
  generate: publicProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      featureDescription: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Calls Claude API, generates tasks
      return {
        tasks: {
          design: Task[],
          frontend: Task[],
          backend: Task[],
        },
        assumptions: string[],
        generationTimeMs: number,
      };
    }),

  export: publicProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      format: z.enum(['markdown', 'json', 'text']),
    }))
    .query(async ({ input, ctx }) => {
      // Formats tasks for export
      return { content: string, filename: string };
    }),
});
```

## Development Environment

**Decision**: Direct execution with Docker Compose for PostgreSQL

**Rationale**:
- PostgreSQL in Docker for consistency
- Node.js apps run directly for faster iteration
- Simple docker-compose.yml for database only

**Development Commands**:
```bash
# Start PostgreSQL
docker-compose up -d

npm install - directly from repo root

# Backend
npx prisma generate
npx prisma migrate dev
npm run start:dev

# Frontend
npm run dev
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: devinsight
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Performance Considerations

**Backend (NestJS)**:
- Async/await throughout
- Connection pooling for PostgreSQL (Prisma handles)
- Claude API timeout: 35s (5s buffer)
- Request caching for common patterns (post-MVP)

**Frontend (Next.js)**:
- Server components where possible
- Code splitting by route
- Lazy loading for Dashboard
- Tailwind purge removes unused CSS
- Estimated bundle: ~150-250KB (well under 500KB)

**Database**:
- Indexes on conversation timestamps
- Indexes on conversationId and department for tasks
- JSONB indexes for task queries (if needed)
- Connection pooling via Prisma

## Security Considerations (OWASP Top 10)

1. **Injection**: Prisma prevents SQL injection; input validation with Zod
2. **Broken Auth**: N/A for MVP (network-level control)
3. **Sensitive Data**: API keys in .env; no PII collected
4. **XML External Entities**: N/A (JSON only)
5. **Broken Access Control**: N/A (single-user MVP)
6. **Security Misconfiguration**: CORS configured; Helmet.js middleware
7. **XSS**: React auto-escapes; CSP headers in Next.js
8. **Insecure Deserialization**: Zod validation on all inputs
9. **Vulnerable Components**: npm audit; Dependabot (post-MVP)
10. **Insufficient Logging**: Winston or Pino for structured logs

## Cost Estimation

**Claude API** (10 concurrent users, monthly):
- ~100 requests/day × 30 days = 3000 requests
- Avg: 1000 input + 2000 output tokens per request
- Cost: ~$150-200/month

**Infrastructure**:
- Database: PostgreSQL free tier (Supabase/Neon) or ~$10-20/month
- Hosting: Vercel (frontend free), Railway/Render (backend ~$5-20/month)
- Total: $5-40/month + Claude API

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Claude API downtime | Retry logic in ai.service.ts; user-friendly errors |
| Rate limits | Request queuing; caching common patterns |
| Slow responses (>30s) | Streaming responses; progress indicators; timeout handling |
| Bundle size bloat | Next.js code splitting; Tailwind purge; bundle analyzer |
| Database connection limits | Prisma connection pooling; proper cleanup |
| Type mismatches | Zod schemas; Prisma generates types; tRPC end-to-end safety |

## Technology Justification (Simplicity First Principle)

✅ **Passes Constitution Check**:
- **TypeScript throughout**: Single language reduces context switching
- **Next.js**: Industry standard, well-documented, not over-engineered
- **NestJS**: Structured but not complex; Express under the hood
- **Prisma**: Simplifies database interactions vs raw SQL
- **tRPC**: Removes need for manual API client code
- **Tailwind + shadcn**: Faster than custom CSS; copy-paste not npm bloat
- **PostgreSQL**: Boring, reliable technology (constitution principle)

## Next Steps (Phase 1)

1. Generate data-model.md with Prisma schema
2. Create API contracts in contracts/ (OpenAPI + tRPC definitions)
3. Write quickstart.md for developers
4. Update agent context file
5. Re-validate Constitution Check

## References

- Next.js: https://nextjs.org/docs
- NestJS: https://docs.nestjs.com/
- Prisma: https://www.prisma.io/docs
- tRPC: https://trpc.io/docs
- Anthropic SDK: https://github.com/anthropics/anthropic-sdk-typescript
- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/docs