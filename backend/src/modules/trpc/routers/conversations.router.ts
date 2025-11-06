import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  createConversationSchema,
  answerQuestionSchema,
  approveRequirementsSchema,
  rejectRequirementsSchema,
} from "../../conversations/dto";
import { z } from "zod";

export const conversationsRouter = router({
  create: publicProcedure
    .input(createConversationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.conversationsService.create(input);
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message || "Failed to create conversation",
        });
      }
    }),

  answer: publicProcedure
    .input(answerQuestionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.conversationsService.answerQuestion(input);
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error?.message || "Failed to answer question",
        });
      }
    }),

  approve: publicProcedure
    .input(approveRequirementsSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Approve requirements
        const approveResult =
          await ctx.conversationsService.approveRequirements(input);

        // Generate tasks
        const tasks = await ctx.tasksService.generateTasks(
          input.conversationId
        );

        return {
          ...approveResult,
          tasks,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error?.message || "Failed to approve requirements",
        });
      }
    }),

  reject: publicProcedure
    .input(rejectRequirementsSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.conversationsService.rejectRequirements(input);
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error?.message || "Failed to reject requirements",
        });
      }
    }),

  get: publicProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.conversationsService.getConversationDetail(
          input.conversationId
        );
      } catch (error: any) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error?.message || "Conversation not found",
        });
      }
    }),
});
