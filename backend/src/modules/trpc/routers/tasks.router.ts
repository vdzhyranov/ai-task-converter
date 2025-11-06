import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { exportTasksSchema } from '../../tasks/dto/export-tasks.dto';

export const tasksRouter = router({
  export: publicProcedure
    .input(exportTasksSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.tasksService.exportTasks(
          input.conversationId,
          input.format,
          input.department,
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error?.message || 'Failed to export tasks',
        });
      }
    }),
});
