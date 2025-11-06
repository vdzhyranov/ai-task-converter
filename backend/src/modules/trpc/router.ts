import { router } from './trpc';
import { conversationsRouter } from './routers/conversations.router';
import { tasksRouter } from './routers/tasks.router';

export const appRouter = router({
  conversations: conversationsRouter,
  tasks: tasksRouter,
});

export type AppRouter = typeof appRouter;