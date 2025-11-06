import { z } from 'zod';

export const rejectRequirementsSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  reason: z
    .string()
    .max(1000, 'Reason must not exceed 1,000 characters')
    .optional(),
});

export type RejectRequirementsDto = z.infer<typeof rejectRequirementsSchema>;
