import { z } from 'zod';

export const createConversationSchema = z.object({
  featureDescription: z
    .string()
    .min(10, 'Feature description must be at least 10 characters')
    .max(10000, 'Feature description must not exceed 10,000 characters'),
});

export type CreateConversationDto = z.infer<typeof createConversationSchema>;
