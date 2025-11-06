import { Module } from '@nestjs/common';
import { TrpcController } from './trpc.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [PrismaModule, ConversationsModule, TasksModule],
  controllers: [TrpcController],
})
export class TrpcModule {}