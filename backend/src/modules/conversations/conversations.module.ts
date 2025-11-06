import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
