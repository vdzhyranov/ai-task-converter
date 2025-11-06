import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { TasksService } from '../tasks/tasks.service';

export interface Context {
  prisma: PrismaService;
  conversationsService: ConversationsService;
  tasksService: TasksService;
}

export function createContext(
  prisma: PrismaService,
  conversationsService: ConversationsService,
  tasksService: TasksService,
): Context {
  return {
    prisma,
    conversationsService,
    tasksService,
  };
}