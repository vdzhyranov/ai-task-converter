# DevInsight Agent - Quickstart Guide

**Feature**: 001-ai-task-converter
**Stack**: TypeScript, Next.js, NestJS, PostgreSQL, Prisma, Claude AI
**Package Manager**: pnpm + Turborepo
**Timeline**: 2-day MVP

## Prerequisites

- Node.js 24.x LTS
- pnpm 8.x or later (`npm install -g pnpm`)
- Docker Desktop (for PostgreSQL)
- Anthropic API key (Claude)
- Git

## Project Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd hackathon

# Checkout feature branch
git checkout 001-ai-task-converter

# Install all dependencies (uses pnpm workspaces)
pnpm install
```

**Monorepo Structure** (Turborepo):
```
hackathon/
├── package.json           # Root package.json with workspaces
├── pnpm-workspace.yaml    # pnpm workspace configuration
├── turbo.json             # Turborepo configuration
├── backend/
│   ├── package.json
│   └── ...
├── frontend/
│   ├── package.json
│   └── ...
└── docker-compose.yml
```

### 2. Environment Configuration

**Backend** (`backend/.env`):
```env
# Database
DATABASE_URL="postgresql://dev:dev123@localhost:5432/devinsight?schema=public"

# Anthropic Claude API
ANTHROPIC_API_KEY="sk-ant-api03-..."

# Server
PORT=3000
NODE_ENV=development

# CORS (adjust for frontend URL)
FRONTEND_URL="http://localhost:3001"
```

**Frontend** (`frontend/.env.local`):
```env
# Backend API
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# tRPC endpoint
NEXT_PUBLIC_TRPC_URL="http://localhost:3000/api/trpc"
```

**Root** (`pnpm-workspace.yaml`):
```yaml
packages:
  - 'backend'
  - 'frontend'
```

**Root** (`turbo.json`):
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "db:migrate": {
      "cache": false
    },
    "db:generate": {
      "cache": false
    }
  }
}
```

### 3. Start PostgreSQL

```bash
# From project root
docker-compose up -d

# Verify PostgreSQL is running
docker ps
```

**docker-compose.yml** (project root):
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

### 4. Database Setup

```bash
# From project root

# Generate Prisma Client
pnpm --filter backend db:generate

# Run migrations
pnpm --filter backend db:migrate

# Alternative: Run from backend directory
cd backend
pnpm db:generate
pnpm db:migrate

# (Optional) Seed database
pnpm --filter backend db:seed

# (Optional) Open Prisma Studio
pnpm --filter backend db:studio
```

**Backend package.json scripts**:
```json
{
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "ts-node prisma/seed.ts",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "test": "jest"
  }
}
```

### 5. Start Development Servers

**Option 1: Run both with Turbo (Recommended)**
```bash
# From project root - starts both frontend and backend in parallel
pnpm dev

# Backend: http://localhost:3000
# Frontend: http://localhost:3001
```

**Option 2: Run individually**
```bash
# Terminal 1 - Backend only
pnpm --filter backend dev

# Terminal 2 - Frontend only
pnpm --filter frontend dev
```

**Root package.json scripts**:
```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^1.11.0"
  }
}
```

### 6. Verify Installation

Open browser and navigate to:
- **Frontend**: http://localhost:3001
- **API Docs**: http://localhost:3000/api/docs
- **Prisma Studio**: http://localhost:5555 (if running)

## Development Workflow

### User Flow (P1-P2 MVP)

1. **Start Conversation**: User enters feature description
2. **Answer Questions**: AI asks 3-5 clarifying questions
3. **Review Requirements**: AI presents requirements summary
4. **Approve**: User approves → AI generates tasks
5. **View Dashboard**: Tasks displayed by department (Design, Frontend, Backend)
6. **Export**: Copy or export tasks

### pnpm Workspace Commands

```bash
# Install dependencies for all workspaces
pnpm install

# Install package in specific workspace
pnpm --filter backend add @anthropic-ai/sdk
pnpm --filter frontend add @trpc/client

# Run command in specific workspace
pnpm --filter backend dev
pnpm --filter frontend build

# Run command in all workspaces (parallel)
pnpm -r dev          # Run dev in all workspaces
pnpm -r build        # Build all workspaces
pnpm -r lint         # Lint all workspaces

# Using Turbo (better for monorepos)
pnpm dev             # Runs turbo run dev (parallel + caching)
pnpm build           # Runs turbo run build (with dependency graph)
pnpm lint            # Runs turbo run lint
```

### API Endpoints

**Create Conversation**:
```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"featureDescription":"Add user profile editing"}'
```

**Answer Question**:
```bash
curl -X POST http://localhost:3000/api/conversations/{id}/answer \
  -H "Content-Type: application/json" \
  -d '{"answer":"Name, email, avatar, and bio"}'
```

**Approve Requirements**:
```bash
curl -X POST http://localhost:3000/api/conversations/{id}/approve
```

**Get Conversation**:
```bash
curl http://localhost:3000/api/conversations/{id}
```

### Frontend Development

**Chat Interface** (P1):
```typescript
// frontend/src/app/page.tsx
import { ChatContainer } from '@/components/chat/chat-container';

export default function Home() {
  return <ChatContainer />;
}
```

**Dashboard** (P2):
```typescript
// frontend/src/app/dashboard/page.tsx
import { TaskDashboard } from '@/components/dashboard/task-dashboard';

export default function Dashboard() {
  return <TaskDashboard />;
}
```

**tRPC Usage**:
```typescript
// frontend/src/components/chat/chat-input.tsx
import { trpc } from '@/lib/trpc';

export function ChatInput() {
  const createMutation = trpc.conversations.create.useMutation();

  const handleSubmit = async (description: string) => {
    const result = await createMutation.mutateAsync({
      featureDescription: description,
    });

    // result.conversationId and result.question are fully typed!
    console.log(result.question.content);
  };

  // ... rest of component
}
```

### Backend Development

**NestJS Module Structure**:
```
backend/src/modules/
├── conversations/
│   ├── conversations.controller.ts  # REST endpoints
│   ├── conversations.service.ts     # Business logic
│   └── dto/                         # Data Transfer Objects
├── tasks/
│   ├── tasks.service.ts             # Task generation logic
│   └── dto/
└── ai/
    ├── ai.service.ts                # Claude integration
    └── prompts/
        └── task-generation.ts       # AI prompts
```

**Service Example**:
```typescript
// backend/src/modules/conversations/conversations.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async create(dto: CreateConversationDto) {
    // 1. Create conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        featureDescription: dto.featureDescription,
        questionCount: 0,
        status: 'ASKING_QUESTIONS',
      },
    });

    // 2. Save user message
    await this.prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        messageType: 'FEATURE_DESCRIPTION',
        content: dto.featureDescription,
        order: 0,
      },
    });

    // 3. Generate first question using Claude
    const question = await this.aiService.generateClarifyingQuestion(
      dto.featureDescription,
      [],
    );

    // 4. Save AI question
    const questionMessage = await this.prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        messageType: 'CLARIFYING_QUESTION',
        content: question,
        order: 1,
      },
    });

    // 5. Update question count
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { questionCount: 1 },
    });

    return {
      conversationId: conversation.id,
      status: conversation.status,
      questionCount: 1,
      question: {
        id: questionMessage.id,
        content: questionMessage.content,
        order: questionMessage.order,
      },
    };
  }

  // ... other methods
}
```

**Claude AI Integration**:
```typescript
// backend/src/modules/ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateClarifyingQuestion(
    featureDescription: string,
    previousQA: Array<{ question: string; answer: string }>,
  ): Promise<string> {
    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: 0.3,
      system: `You are a product requirements analyst. Ask ONE specific clarifying question about the feature to help generate better task breakdowns.`,
      messages: [
        {
          role: 'user',
          content: `Feature: ${featureDescription}\n\nPrevious Q&A:\n${this.formatQA(previousQA)}\n\nAsk ONE specific clarifying question:`,
        },
      ],
    });

    return message.content[0].text;
  }

  private formatQA(qa: Array<{ question: string; answer: string }>): string {
    return qa.map((item, i) => `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer}`).join('\n\n');
  }

  // ... other methods for requirements summary and task generation
}
```

## Database Management

### Prisma Commands (with pnpm)

```bash
# From project root
pnpm --filter backend db:generate      # Generate Prisma Client
pnpm --filter backend db:migrate       # Create & apply migration
pnpm --filter backend db:studio        # Open Prisma Studio
pnpm --filter backend db:seed          # Seed database

# From backend directory
cd backend
pnpm db:generate
pnpm db:migrate
pnpm db:studio

# Create migration with name
cd backend
pnpm prisma migrate dev --name add-conversation-status

# Apply migrations (production)
pnpm prisma migrate deploy

# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset
```

### Viewing Data

```bash
# Prisma Studio (GUI)
pnpm --filter backend db:studio

# PostgreSQL CLI
docker exec -it <postgres-container-id> psql -U dev -d devinsight

# List tables
\dt

# View conversations
SELECT * FROM "Conversation";

# View messages
SELECT * FROM "ConversationMessage" WHERE "conversationId" = '<uuid>';
```

## Testing

### Manual Testing Flow

1. **Create Conversation**:
   - Navigate to http://localhost:3001
   - Enter feature description: "Add dark mode toggle"
   - Submit

2. **Answer Questions**:
   - AI asks: "Should dark mode persist across sessions?"
   - Answer: "Yes, save to user preferences"
   - Continue for 3-5 questions

3. **Review Requirements**:
   - AI presents requirements summary
   - Review and approve

4. **View Tasks**:
   - Navigate to dashboard
   - See tasks grouped by Design, Frontend, Backend

5. **Export Tasks**:
   - Click "Copy All" for a department
   - Paste into your project management tool

### API Testing (Postman/Insomnia)

Import OpenAPI spec:
```
http://localhost:3000/api/docs-json
```

### Unit/Integration Tests (Optional for MVP)

```bash
# Run all tests (using Turbo)
pnpm test

# Test specific workspace
pnpm --filter backend test
pnpm --filter frontend test

# Watch mode
pnpm --filter backend test:watch
pnpm --filter frontend test:watch
```

## Turborepo Benefits

### Parallel Execution

```bash
# Turbo runs tasks in parallel across workspaces
pnpm dev    # Starts both backend and frontend simultaneously

# Traditional approach (sequential)
pnpm --filter backend dev && pnpm --filter frontend dev
```

### Caching

```bash
# Turbo caches build outputs
pnpm build  # First run: ~30s
pnpm build  # Cached: ~100ms (if no changes)

# Clear cache
pnpm turbo run build --force
```

### Dependency Graph

```bash
# Turbo understands workspace dependencies
# If frontend depends on backend types, backend builds first
pnpm build

# View task graph
pnpm turbo run build --graph
```

## Troubleshooting

### pnpm Issues

```bash
# Clear pnpm cache
pnpm store prune

# Reinstall all dependencies
rm -rf node_modules backend/node_modules frontend/node_modules
pnpm install

# Fix pnpm lockfile
pnpm install --frozen-lockfile=false
```

### Database Connection Issues

```bash
# Check PostgreSQL status
docker ps

# Restart PostgreSQL
docker-compose restart

# View PostgreSQL logs
docker-compose logs postgres
```

### Prisma Issues

```bash
# Regenerate client
pnpm --filter backend db:generate

# Reset and re-migrate
cd backend
pnpm prisma migrate reset
pnpm prisma migrate dev
```

### Claude API Issues

**Rate Limits**:
- Check API usage at https://console.anthropic.com/
- Implement exponential backoff (already in ai.service.ts)

**Timeouts**:
- Increase timeout in ai.service.ts if needed
- Default: 35s (5s buffer beyond 30s requirement)

### CORS Issues

Update `backend/src/main.ts`:
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
});
```

### Turbo Cache Issues

```bash
# Clear Turbo cache
rm -rf .turbo

# Force rebuild without cache
pnpm turbo run build --force

# Disable cache for development
pnpm turbo run dev --no-cache
```

## shadcn/ui Components

### Install Components (with pnpm)

```bash
cd frontend

# Install CLI
pnpm dlx shadcn-ui@latest init

# Add components
pnpm dlx shadcn-ui@latest add button
pnpm dlx shadcn-ui@latest add card
pnpm dlx shadcn-ui@latest add textarea
pnpm dlx shadcn-ui@latest add badge
pnpm dlx shadcn-ui@latest add separator
```

### Usage

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export function TaskCard({ task }: { task: Task }) {
  return (
    <Card>
      <CardHeader>{task.description}</CardHeader>
      <CardContent>
        {task.acceptanceCriteria.map((criteria, i) => (
          <div key={i}>{criteria}</div>
        ))}
      </CardContent>
    </Card>
  );
}
```

## Deployment (Post-MVP)

### Database

- **Supabase**: Free PostgreSQL hosting
- **Neon**: Serverless PostgreSQL
- **Railway**: PostgreSQL with automatic backups

### Backend

- **Railway**: Easy NestJS deployment
- **Render**: Auto-deploy from Git
- **Fly.io**: Edge deployment

### Frontend

- **Vercel**: Automatic Next.js deployment (recommended)
- **Netlify**: Alternative with good DX

### Environment Variables

Set in deployment platform:
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `FRONTEND_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_TRPC_URL`

## Performance Monitoring

```bash
# Bundle size analysis (Frontend)
pnpm --filter frontend build
pnpm --filter frontend analyze

# Check Turbo cache performance
pnpm turbo run build --summarize

# API response times (Backend)
# Check NestJS logs for request duration
```

## Useful pnpm + Turbo Commands

```bash
# Development
pnpm dev                              # Start all workspaces (parallel)
pnpm --filter backend dev             # Start backend only
pnpm --filter frontend dev            # Start frontend only

# Building
pnpm build                            # Build all (respects dependencies)
pnpm turbo run build --force          # Force rebuild (no cache)

# Database
pnpm --filter backend db:migrate      # Run migrations
pnpm --filter backend db:studio       # Open Prisma Studio
pnpm --filter backend db:generate     # Generate Prisma Client

# Testing
pnpm test                             # Run all tests
pnpm --filter backend test:watch      # Watch mode (backend)

# Linting
pnpm lint                             # Lint all workspaces
pnpm --filter backend lint:fix        # Auto-fix (backend)

# Dependencies
pnpm add -D typescript                # Add to root
pnpm --filter backend add zod         # Add to backend
pnpm --filter frontend add @trpc/client  # Add to frontend

# Clean
pnpm turbo run clean                  # Clean all build outputs
rm -rf .turbo node_modules */node_modules  # Nuclear option
pnpm install                          # Reinstall
```

## Resources

- **pnpm**: https://pnpm.io/
- **Turborepo**: https://turbo.build/repo/docs
- **NestJS**: https://docs.nestjs.com/
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **tRPC**: https://trpc.io/docs
- **Anthropic Claude**: https://docs.anthropic.com/
- **shadcn/ui**: https://ui.shadcn.com/

## Support

For issues or questions:
1. Check this quickstart guide
2. Review API documentation at http://localhost:3000/api/docs
3. Check data model at `specs/001-ai-task-converter/data-model.md`
4. Review research decisions at `specs/001-ai-task-converter/research.md`