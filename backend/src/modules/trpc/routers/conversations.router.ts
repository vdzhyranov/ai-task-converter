import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

export const conversationsRouter = router({
  // Procedures will be implemented in Phase 3
  create: publicProcedure
    .input(z.object({ featureDescription: z.string() }))
    .mutation(async () => {
      throw new Error('Not implemented');
    }),

  answer: publicProcedure
    .input(z.object({ conversationId: z.string(), answer: z.string() }))
    .mutation(async () => {
      throw new Error('Not implemented');
    }),

  approve: publicProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async () => {
      throw new Error('Not implemented');
    }),

  reject: publicProcedure
    .input(z.object({ conversationId: z.string(), reason: z.string().optional() }))
    .mutation(async () => {
      throw new Error('Not implemented');
    }),

  get: publicProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async () => {
      throw new Error('Not implemented');
    }),
});