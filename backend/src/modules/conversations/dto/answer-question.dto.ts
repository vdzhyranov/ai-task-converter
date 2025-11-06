import { z } from 'zod';

export const answerQuestionSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  answer: z
    .string()
    .min(1, 'Answer cannot be empty')
    .max(10000, 'Answer must not exceed 10,000 characters'),
});

export type AnswerQuestionDto = z.infer<typeof answerQuestionSchema>;
