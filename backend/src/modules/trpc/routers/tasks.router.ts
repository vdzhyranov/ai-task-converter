import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

export const tasksRouter = router({
  // Procedures will be implemented in Phase 4
  export: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        format: z.enum(['markdown', 'json', 'text']),
        department: z.enum(['DESIGN', 'FRONTEND', 'BACKEND']).optional(),
      }),
    )
    .query(async () => {
      throw new Error('Not implemented');
    }),
});