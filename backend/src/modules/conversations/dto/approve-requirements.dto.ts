import { z } from 'zod';

export const approveRequirementsSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
});

export type ApproveRequirementsDto = z.infer<typeof approveRequirementsSchema>;
