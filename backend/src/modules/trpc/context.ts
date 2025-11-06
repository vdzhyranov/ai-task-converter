import { PrismaService } from '../prisma/prisma.service';

export interface Context {
  prisma: PrismaService;
}

export function createContext(prisma: PrismaService): Context {
  return {
    prisma,
  };
}