# Data Model: DevInsight Agent

**Feature**: 001-ai-task-converter
**Date**: 2025-11-06
**Database**: PostgreSQL 15.x/16.x with Prisma ORM

## Overview

The data model supports the core MVP features (P1-P2) with a multi-turn conversational flow:
1. User submits feature description
2. AI asks 3-5 clarifying questions
3. User answers each question (multi-turn conversation)
4. AI presents requirements summary
5. User approves requirements
6. AI generates tasks
7. All conversation history saved

The schema is optimized for:
- Multi-turn conversation tracking
- Requirements approval workflow
- Fast task generation and retrieval
- Complete conversation history (P4 feature)
- Department-based task organization

## Entity Relationship Diagram

```
┌─────────────────────┐
│   Conversation      │
│─────────────────────│
│ id (PK)             │
│ featureDescription  │◄──┐
│ requirementsSummary │   │
│ generatedTasks      │   │ 1:N
│ assumptions         │   │
│ questionCount       │   │
│ status              │   │
│ createdAt           │   │
│ updatedAt           │   │
└─────────────────────┘   │
         │                │
         │ 1:N            │
         ▼                │
┌─────────────────────┐   │
│ ConversationMessage │   │
│─────────────────────│   │
│ id (PK)             │   │
│ conversationId (FK) │   │
│ role                │   │
│ content             │   │
│ messageType         │   │
│ order               │   │
│ createdAt           │   │
└─────────────────────┘   │
                          │
                      ┌───┴──────────┐
                      │     Task     │
                      │──────────────│
                      │ id (PK)      │
                      │ conversationId (FK)
                      │ department   │
                      │ description  │
                      │ acceptanceCriteria
                      │ priority     │
                      │ createdAt    │
                      └──────────────┘
```

## Prisma Schema

```prisma
// backend/src/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Conversation {
  id                  String               @id @default(uuid())
  featureDescription  String               @db.Text
  requirementsSummary String?              @db.Text  // AI-generated requirements for user approval
  generatedTasks      Json?                // Structured task data for quick access
  assumptions         String[]
  questionCount       Int                  @default(0)  // Track number of questions asked (max 5)
  status              ConversationStatus   @default(ASKING_QUESTIONS)
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  messages            ConversationMessage[]
  tasks               Task[]

  @@index([createdAt(sort: Desc)])
  @@index([status])
}

model ConversationMessage {
  id             String          @id @default(uuid())
  conversationId String
  role           MessageRole
  content        String          @db.Text
  messageType    MessageType
  order          Int             // Message order in conversation (0, 1, 2...)
  createdAt      DateTime        @default(now())
  conversation   Conversation    @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, order])
  @@index([conversationId, createdAt])
}

model Task {
  id                 String       @id @default(uuid())
  conversationId     String
  department         Department
  description        String       @db.Text
  acceptanceCriteria String[]
  priority           Int?
  createdAt          DateTime     @default(now())
  conversation       Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([department])
  @@index([conversationId, department])
}

enum Department {
  DESIGN
  FRONTEND
  BACKEND
}

enum ConversationStatus {
  ASKING_QUESTIONS      // AI is asking clarifying questions (0-5 questions)
  AWAITING_APPROVAL     // Requirements summary presented, awaiting user approval
  GENERATING_TASKS      // User approved, AI generating tasks
  COMPLETED             // Tasks successfully generated
  FAILED                // Generation failed (AI error, timeout, etc.)
}

enum MessageRole {
  USER      // Message from product manager
  ASSISTANT // Message from AI (Claude)
  SYSTEM    // System messages (status updates, errors)
}

enum MessageType {
  FEATURE_DESCRIPTION   // Initial feature description from user
  CLARIFYING_QUESTION   // AI asking a question
  ANSWER                // User answering a question
  REQUIREMENTS_SUMMARY  // AI presenting requirements for approval
  APPROVAL              // User approving requirements
  REJECTION             // User rejecting requirements (back to questions)
  TASK_RESULT           // Final task generation result
  ERROR                 // Error message
}
```

## Entity Details

### Conversation

Represents a complete feature-to-task conversion session with multi-turn conversation.

**Fields**:
- `id` (UUID): Primary key, auto-generated
- `featureDescription` (Text): Original feature request from product manager
- `requirementsSummary` (Text, nullable): AI-generated requirements summary for user approval
- `generatedTasks` (JSONB, nullable): Denormalized task structure for fast retrieval
- `assumptions` (String[]): Array of assumptions made by AI during generation (per FR-009)
- `questionCount` (Int): Number of questions asked so far (max 5 per FR-016)
- `status` (Enum): Current state of the conversation workflow
- `createdAt` (DateTime): Timestamp of conversation creation
- `updatedAt` (DateTime): Last modification timestamp
- `messages` (Relation): One-to-many relationship with ConversationMessage
- `tasks` (Relation): One-to-many relationship with Task model

**Justification**:
- `requirementsSummary` captures AI's interpretation before task generation
- `questionCount` enforces 3-5 question limit (FR-016)
- JSONB `generatedTasks` provides O(1) access for dashboard (P2)
- Separate `ConversationMessage` table maintains full conversation history

**Indexes**:
- `createdAt DESC`: Optimizes conversation history listing (P4)
- `status`: Enables filtering by workflow state

### ConversationMessage

Stores individual messages in the multi-turn conversation.

**Fields**:
- `id` (UUID): Primary key, auto-generated
- `conversationId` (UUID FK): Links to parent conversation
- `role` (Enum): USER | ASSISTANT | SYSTEM
- `content` (Text): Message content (question, answer, or system message)
- `messageType` (Enum): Categorizes message purpose in workflow
- `order` (Int): Sequential order of message in conversation (0-based)
- `createdAt` (DateTime): Timestamp of message creation
- `conversation` (Relation): Many-to-one relationship with Conversation

**Justification**:
- `role` distinguishes between user and AI messages (chat interface requirement)
- `messageType` enables workflow tracking (questions vs answers vs approvals)
- `order` ensures proper message sequencing in UI
- Full message history supports P4 (conversation history feature)

**Indexes**:
- `(conversationId, order)`: Fast ordered retrieval of conversation thread
- `(conversationId, createdAt)`: Alternative ordering by timestamp

### Task

Individual task within a conversation, organized by department.

**Fields**:
- `id` (UUID): Primary key, auto-generated
- `conversationId` (UUID FK): Links to parent conversation
- `department` (Enum): DESIGN | FRONTEND | BACKEND (per FR-003)
- `description` (Text): Task description generated by AI (per FR-008)
- `acceptanceCriteria` (String[]): Array of acceptance criteria (per FR-008)
- `priority` (Int, Optional): Task priority within department
- `createdAt` (DateTime): Timestamp of task creation
- `conversation` (Relation): Many-to-one relationship with Conversation

**Justification**:
- Normalized structure enables querying tasks across conversations
- `acceptanceCriteria` as array supports multiple criteria per task
- Cascade delete ensures cleanup when conversation deleted

**Indexes**:
- `conversationId`: Fast lookup of all tasks for a conversation
- `department`: Enables department-based filtering
- `(conversationId, department)`: Composite index optimizes dashboard queries

## Enum Types

### Department

```typescript
enum Department {
  DESIGN = 'DESIGN',
  FRONTEND = 'FRONTEND',
  BACKEND = 'BACKEND',
}
```

### ConversationStatus

```typescript
enum ConversationStatus {
  ASKING_QUESTIONS = 'ASKING_QUESTIONS',      // AI asking clarifying questions (0-5)
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',   // Requirements presented, user reviewing
  GENERATING_TASKS = 'GENERATING_TASKS',     // User approved, AI generating tasks
  COMPLETED = 'COMPLETED',                   // Tasks successfully generated
  FAILED = 'FAILED',                         // Generation failed
}
```

### MessageRole

```typescript
enum MessageRole {
  USER = 'USER',           // Product manager
  ASSISTANT = 'ASSISTANT', // AI (Claude)
  SYSTEM = 'SYSTEM',       // System notifications
}
```

### MessageType

```typescript
enum MessageType {
  FEATURE_DESCRIPTION = 'FEATURE_DESCRIPTION',     // Initial user input
  CLARIFYING_QUESTION = 'CLARIFYING_QUESTION',     // AI question
  ANSWER = 'ANSWER',                               // User answer
  REQUIREMENTS_SUMMARY = 'REQUIREMENTS_SUMMARY',   // AI requirements for approval
  APPROVAL = 'APPROVAL',                           // User approves requirements
  REJECTION = 'REJECTION',                         // User rejects (needs changes)
  TASK_RESULT = 'TASK_RESULT',                     // Final generated tasks
  ERROR = 'ERROR',                                 // Error message
}
```

## Data Flow

### Complete Conversation Flow

```
1. User submits feature description
   └─> POST /api/conversations/create
       └─> Create Conversation (status: ASKING_QUESTIONS, questionCount: 0)
       └─> Create ConversationMessage (role: USER, type: FEATURE_DESCRIPTION, order: 0)
       └─> AI generates first clarifying question
       └─> Create ConversationMessage (role: ASSISTANT, type: CLARIFYING_QUESTION, order: 1)
       └─> Update questionCount = 1
       └─> Return: { conversationId, question }

2. User answers question
   └─> POST /api/conversations/:id/answer
       └─> Create ConversationMessage (role: USER, type: ANSWER, order: 2)
       └─> If questionCount < 5 && more clarity needed:
           ├─> AI generates next question
           ├─> Create ConversationMessage (role: ASSISTANT, type: CLARIFYING_QUESTION, order: 3)
           ├─> Update questionCount += 1
           └─> Return: { question }
       └─> If questionCount >= 5 OR sufficient clarity:
           ├─> AI generates requirements summary
           ├─> Create ConversationMessage (role: ASSISTANT, type: REQUIREMENTS_SUMMARY, order: N)
           ├─> Update Conversation (status: AWAITING_APPROVAL, requirementsSummary: summary)
           └─> Return: { requirementsSummary }

3. User reviews requirements
   └─> POST /api/conversations/:id/approve OR /reject
       └─> If APPROVE:
           ├─> Create ConversationMessage (role: USER, type: APPROVAL, order: N+1)
           ├─> Update Conversation (status: GENERATING_TASKS)
           ├─> AI generates tasks
           ├─> Create Task records (bulk insert)
           ├─> Create ConversationMessage (role: ASSISTANT, type: TASK_RESULT, order: N+2)
           ├─> Update Conversation (status: COMPLETED, generatedTasks: JSON)
           └─> Return: { tasks }
       └─> If REJECT:
           ├─> Create ConversationMessage (role: USER, type: REJECTION, order: N+1)
           ├─> Update Conversation (status: ASKING_QUESTIONS)
           ├─> AI asks follow-up question
           └─> Continue question loop

4. Dashboard retrieval
   └─> GET /api/conversations/:id
       └─> Return: Conversation with messages and tasks
```

## Example Conversation Flow

### Step 1: Initial Feature Description

```json
// POST /api/conversations/create
{
  "featureDescription": "Add user profile editing"
}

// Response
{
  "conversationId": "conv-123",
  "status": "ASKING_QUESTIONS",
  "questionCount": 1,
  "question": {
    "id": "msg-2",
    "content": "What specific profile fields should users be able to edit (e.g., name, email, avatar, bio)?",
    "order": 1
  }
}

// Database State
Conversation:
  id: conv-123
  featureDescription: "Add user profile editing"
  questionCount: 1
  status: ASKING_QUESTIONS

Messages:
  [0] role: USER, type: FEATURE_DESCRIPTION, content: "Add user profile editing"
  [1] role: ASSISTANT, type: CLARIFYING_QUESTION, content: "What specific profile fields..."
```

### Step 2: User Answers (Question 1 of 5)

```json
// POST /api/conversations/conv-123/answer
{
  "answer": "Name, email, avatar image, and bio text up to 500 characters"
}

// Response (AI asks another question)
{
  "questionCount": 2,
  "question": {
    "id": "msg-4",
    "content": "Should users be able to change their email address, or is that handled separately for security?",
    "order": 3
  }
}

// Messages:
  [2] role: USER, type: ANSWER, content: "Name, email, avatar..."
  [3] role: ASSISTANT, type: CLARIFYING_QUESTION, content: "Should users be able..."
```

### Step 3: Continue Q&A (Questions 2-4)

```
... similar pattern for questions 2, 3, 4 ...
questionCount increments with each question
```

### Step 4: Requirements Summary (After 3-5 Questions)

```json
// POST /api/conversations/conv-123/answer (final answer)
{
  "answer": "Yes, validation should show errors inline"
}

// Response (AI presents requirements)
{
  "status": "AWAITING_APPROVAL",
  "requirementsSummary": {
    "id": "msg-10",
    "content": "Based on our conversation, here are the requirements:\n\n**Profile Fields**:\n- Name (text, required)\n- Email (text, required, validated, confirmation flow)\n- Avatar (image upload, max 5MB, JPEG/PNG)\n- Bio (text area, max 500 chars)\n\n**Validation**:\n- Inline error messages\n- Email format validation\n- File size/type validation\n\n**User Experience**:\n- Auto-save draft changes\n- Confirmation before discarding\n- Mobile-responsive design\n\nDo these requirements accurately capture what you need?",
    "order": 10
  }
}

// Conversation:
  questionCount: 4
  status: AWAITING_APPROVAL
  requirementsSummary: "Based on our conversation..."

// Messages:
  [10] role: ASSISTANT, type: REQUIREMENTS_SUMMARY, content: "Based on our conversation..."
```

### Step 5: User Approves

```json
// POST /api/conversations/conv-123/approve

// Response (AI generates tasks)
{
  "status": "COMPLETED",
  "tasks": {
    "design": [
      {
        "id": "task-1",
        "description": "Design profile editing screen wireframes",
        "acceptanceCriteria": [
          "Include all 4 profile fields",
          "Show inline validation states",
          "Mobile and desktop layouts"
        ]
      }
    ],
    "frontend": [...],
    "backend": [...]
  },
  "generationTimeMs": 3200
}

// Conversation:
  status: COMPLETED
  generatedTasks: { design: [...], frontend: [...], backend: [...] }

// Messages:
  [11] role: USER, type: APPROVAL, content: "Approved"
  [12] role: ASSISTANT, type: TASK_RESULT, content: "Tasks generated successfully"

// Tasks:
  [Multiple Task records created with conversationId: conv-123]
```

## Validation Rules

**Conversation**:
- `featureDescription`: Min 10 chars, max 10,000 chars
- `questionCount`: 0-5 (enforced by business logic)
- `assumptions`: Max 10 assumptions

**ConversationMessage**:
- `content`: Min 1 char, max 10,000 chars
- `order`: Must be sequential (0, 1, 2, ...)

**Task**:
- `description`: Min 5 chars, max 2,000 chars
- `acceptanceCriteria`: 1-10 criteria, each max 500 chars

## Performance Optimizations

1. **Composite Indexes**:
   - `(conversationId, order)` enables fast chronological message retrieval
   - `(conversationId, department)` optimizes dashboard queries

2. **JSONB for Fast Reads**:
   - `generatedTasks` JSONB column enables instant dashboard rendering
   - Avoids JOIN overhead for completed conversations

3. **Message Ordering**:
   - `order` field provides O(1) sorting vs timestamp-based sorting

4. **Cascade Deletes**:
   - Automatic cleanup of messages and tasks when conversation deleted

## State Machine

```
ASKING_QUESTIONS (questionCount 0-5)
    │
    ├─> (answer received && questionCount < 5 && need more clarity)
    │   └─> ASKING_QUESTIONS (questionCount++)
    │
    ├─> (answer received && (questionCount >= 5 || sufficient clarity))
    │   └─> AWAITING_APPROVAL
    │
    └─> (error)
        └─> FAILED

AWAITING_APPROVAL
    │
    ├─> (user approves)
    │   └─> GENERATING_TASKS
    │
    ├─> (user rejects)
    │   └─> ASKING_QUESTIONS
    │
    └─> (timeout / error)
        └─> FAILED

GENERATING_TASKS
    │
    ├─> (tasks generated successfully)
    │   └─> COMPLETED
    │
    └─> (AI error / timeout)
        └─> FAILED

COMPLETED (terminal state)
FAILED (terminal state)
```

## Migration Strategy

**Initial Migration**:
```bash
npx prisma migrate dev --name init
```

Creates all tables, indexes, and enums.

**Seed Data** (for testing):
```typescript
// Sample conversation with Q&A flow
await prisma.conversation.create({
  data: {
    featureDescription: "Add dark mode toggle",
    questionCount: 3,
    status: "COMPLETED",
    messages: {
      create: [
        { role: "USER", messageType: "FEATURE_DESCRIPTION", content: "Add dark mode toggle", order: 0 },
        { role: "ASSISTANT", messageType: "CLARIFYING_QUESTION", content: "Should dark mode persist across sessions?", order: 1 },
        { role: "USER", messageType: "ANSWER", content: "Yes, save to user preferences", order: 2 },
        // ... more messages
      ]
    },
    tasks: {
      create: [
        { department: "DESIGN", description: "Design dark mode color palette", acceptanceCriteria: ["Meets WCAG AA contrast"] },
        // ... more tasks
      ]
    }
  }
});
```

## Compliance with Constitution

✅ **Simplicity First**: Standard relational schema, no over-engineering
✅ **User-Centric Design**: Models support complete user workflow (Q&A → approval → tasks)
✅ **Web Application Standards**: Proper indexes, foreign keys, cascade deletes
✅ **Documentation as Code**: Schema as single source of truth

## Next Steps

1. Implement Prisma schema in `backend/src/prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev --name init`
3. Generate Prisma Client: `npx prisma generate`
4. Update API contracts to reflect multi-turn conversation flow
5. Implement state machine logic in ConversationsService