/**
 * tRPC Router Definitions for DevInsight Agent
 *
 * This file defines the end-to-end type-safe API procedures using tRPC.
 * These procedures wrap the underlying NestJS services and provide
 * automatic TypeScript type inference on the frontend.
 *
 * Backend: backend/src/modules/trpc/router.ts
 * Frontend: frontend/src/lib/trpc.ts (client)
 */

import { z } from 'zod';
import { router, publicProcedure } from './trpc';

// ============================================================================
// Zod Schemas (Input Validation)
// ============================================================================

const departmentSchema = z.enum(['DESIGN', 'FRONTEND', 'BACKEND']);

const conversationStatusSchema = z.enum([
  'ASKING_QUESTIONS',
  'AWAITING_APPROVAL',
  'GENERATING_TASKS',
  'COMPLETED',
  'FAILED',
]);

const messageRoleSchema = z.enum(['USER', 'ASSISTANT', 'SYSTEM']);

const messageTypeSchema = z.enum([
  'FEATURE_DESCRIPTION',
  'CLARIFYING_QUESTION',
  'ANSWER',
  'REQUIREMENTS_SUMMARY',
  'APPROVAL',
  'REJECTION',
  'TASK_RESULT',
  'ERROR',
]);

// Input schemas
const createConversationSchema = z.object({
  featureDescription: z
    .string()
    .min(10, 'Feature description must be at least 10 characters')
    .max(10000, 'Feature description must not exceed 10,000 characters'),
});

const answerQuestionSchema = z.object({
  conversationId: z.string().uuid(),
  answer: z
    .string()
    .min(1, 'Answer cannot be empty')
    .max(10000, 'Answer must not exceed 10,000 characters'),
});

const approveRequirementsSchema = z.object({
  conversationId: z.string().uuid(),
});

const rejectRequirementsSchema = z.object({
  conversationId: z.string().uuid(),
  reason: z.string().max(1000).optional(),
});

const getConversationSchema = z.object({
  conversationId: z.string().uuid(),
});

const listConversationsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  status: conversationStatusSchema.optional(),
});

const exportTasksSchema = z.object({
  conversationId: z.string().uuid(),
  format: z.enum(['markdown', 'json', 'text']),
  department: departmentSchema.optional(),
});

// ============================================================================
// Output Types (Response Schemas)
// ============================================================================

export type Department = z.infer<typeof departmentSchema>;
export type ConversationStatus = z.infer<typeof conversationStatusSchema>;
export type MessageRole = z.infer<typeof messageRoleSchema>;
export type MessageType = z.infer<typeof messageTypeSchema>;

export interface Question {
  id: string;
  content: string;
  order: number;
}

export interface Task {
  id: string;
  department: Department;
  description: string;
  acceptanceCriteria: string[];
  priority: number | null;
  createdAt: Date;
}

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  messageType: MessageType;
  content: string;
  order: number;
  createdAt: Date;
}

export interface CreateConversationResponse {
  conversationId: string;
  status: 'ASKING_QUESTIONS';
  questionCount: number;
  question: Question;
}

export interface NextQuestionResponse {
  status: 'ASKING_QUESTIONS';
  questionCount: number;
  question: Question;
}

export interface RequirementsSummaryResponse {
  status: 'AWAITING_APPROVAL';
  questionCount: number;
  requirementsSummary: {
    id: string;
    content: string;
    order: number;
  };
}

export type AnswerQuestionResponse =
  | NextQuestionResponse
  | RequirementsSummaryResponse;

export interface TaskGenerationResponse {
  conversationId: string;
  status: 'COMPLETED';
  tasks: {
    design: Task[];
    frontend: Task[];
    backend: Task[];
  };
  assumptions: string[];
  generationTimeMs: number;
}

export interface ConversationSummary {
  id: string;
  featureDescription: string;
  status: ConversationStatus;
  questionCount: number;
  taskCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDetail {
  id: string;
  featureDescription: string;
  requirementsSummary: string | null;
  status: ConversationStatus;
  questionCount: number;
  assumptions: string[];
  messages: ConversationMessage[];
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportTasksResponse {
  content: string;
  filename: string;
}

// ============================================================================
// tRPC Routers
// ============================================================================

/**
 * Conversations Router
 * Handles multi-turn conversation flow with AI
 */
export const conversationsRouter = router({
  /**
   * Create new conversation
   * POST /api/conversations
   */
  create: publicProcedure
    .input(createConversationSchema)
    .mutation(async ({ input, ctx }): Promise<CreateConversationResponse> => {
      // Implementation calls NestJS ConversationsService.create()
      // Returns conversation ID and first clarifying question
      throw new Error('Implemented in backend/src/modules/conversations/');
    }),

  /**
   * Answer clarifying question
   * POST /api/conversations/:id/answer
   */
  answer: publicProcedure
    .input(answerQuestionSchema)
    .mutation(async ({ input, ctx }): Promise<AnswerQuestionResponse> => {
      // Implementation calls ConversationsService.answerQuestion()
      // Returns either next question OR requirements summary
      throw new Error('Implemented in backend/src/modules/conversations/');
    }),

  /**
   * Approve requirements
   * POST /api/conversations/:id/approve
   */
  approve: publicProcedure
    .input(approveRequirementsSchema)
    .mutation(async ({ input, ctx }): Promise<TaskGenerationResponse> => {
      // Implementation calls TasksService.generateTasks()
      // Returns structured tasks by department
      throw new Error('Implemented in backend/src/modules/tasks/');
    }),

  /**
   * Reject requirements
   * POST /api/conversations/:id/reject
   */
  reject: publicProcedure
    .input(rejectRequirementsSchema)
    .mutation(async ({ input, ctx }): Promise<NextQuestionResponse> => {
      // Implementation calls ConversationsService.rejectRequirements()
      // Returns to ASKING_QUESTIONS state with new question
      throw new Error('Implemented in backend/src/modules/conversations/');
    }),

  /**
   * Get conversation details
   * GET /api/conversations/:id
   */
  get: publicProcedure
    .input(getConversationSchema)
    .query(async ({ input, ctx }): Promise<ConversationDetail> => {
      // Implementation calls ConversationsService.getConversationDetail()
      // Returns full conversation with messages and tasks
      throw new Error('Implemented in backend/src/modules/conversations/');
    }),

  /**
   * List conversations (P4 feature)
   * GET /api/conversations
   */
  list: publicProcedure
    .input(listConversationsSchema)
    .query(async ({ input, ctx }): Promise<{
      conversations: ConversationSummary[];
      total: number;
      limit: number;
      offset: number;
    }> => {
      // Implementation calls ConversationsService.listConversations()
      // Returns paginated list
      throw new Error('Implemented in backend/src/modules/conversations/');
    }),
});

/**
 * Tasks Router
 * Handles task-related operations
 */
export const tasksRouter = router({
  /**
   * Export tasks
   * POST /api/tasks/export
   */
  export: publicProcedure
    .input(exportTasksSchema)
    .query(async ({ input, ctx }): Promise<ExportTasksResponse> => {
      // Implementation calls TasksService.exportTasks()
      // Returns formatted task content and filename
      throw new Error('Implemented in backend/src/modules/tasks/');
    }),
});

/**
 * App Router
 * Combines all routers into single tRPC router
 */
export const appRouter = router({
  conversations: conversationsRouter,
  tasks: tasksRouter,
});

// Export type for frontend usage
export type AppRouter = typeof appRouter;

// ============================================================================
// Frontend Usage Example
// ============================================================================

/*
// frontend/src/lib/trpc.ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../backend/src/modules/trpc/router';

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
    }),
  ],
});

// ============================================================================
// Frontend Component Example
// ============================================================================

// frontend/src/components/chat/chat-container.tsx
import { trpc } from '@/lib/trpc';
import { useState } from 'react';

export function ChatContainer() {
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Create conversation
  const createMutation = trpc.conversations.create.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      // data.question is fully typed!
      console.log(data.question.content);
    },
  });

  // Answer question
  const answerMutation = trpc.conversations.answer.useMutation({
    onSuccess: (data) => {
      if (data.status === 'ASKING_QUESTIONS') {
        // TypeScript knows this is NextQuestionResponse
        console.log('Next question:', data.question.content);
      } else {
        // TypeScript knows this is RequirementsSummaryResponse
        console.log('Requirements:', data.requirementsSummary.content);
      }
    },
  });

  // Approve requirements
  const approveMutation = trpc.conversations.approve.useMutation({
    onSuccess: (data) => {
      // data.tasks is fully typed with design/frontend/backend arrays
      console.log('Design tasks:', data.tasks.design.length);
    },
  });

  const handleStartConversation = async (description: string) => {
    createMutation.mutate({ featureDescription: description });
  };

  const handleAnswerQuestion = async (answer: string) => {
    if (!conversationId) return;
    answerMutation.mutate({ conversationId, answer });
  };

  const handleApprove = async () => {
    if (!conversationId) return;
    approveMutation.mutate({ conversationId });
  };

  // ... rest of component
}
*/

// ============================================================================
// Backend Implementation Reference
// ============================================================================

/*
// backend/src/modules/trpc/router.ts
import { conversationsRouter, tasksRouter } from './routers';
import { router } from './trpc';

export const appRouter = router({
  conversations: conversationsRouter,
  tasks: tasksRouter,
});

export type AppRouter = typeof appRouter;

// backend/src/modules/trpc/routers/conversations.router.ts
import { router, publicProcedure } from '../trpc';
import { ConversationsService } from '../../conversations/conversations.service';
import { z } from 'zod';

export const conversationsRouter = router({
  create: publicProcedure
    .input(z.object({ featureDescription: z.string().min(10) }))
    .mutation(async ({ input, ctx }) => {
      const conversationsService = ctx.conversationsService;
      return await conversationsService.create(input);
    }),

  answer: publicProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      answer: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const conversationsService = ctx.conversationsService;
      return await conversationsService.answerQuestion(
        input.conversationId,
        input.answer,
      );
    }),

  // ... other procedures
});
*/