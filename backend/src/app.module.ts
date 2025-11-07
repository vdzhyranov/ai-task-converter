import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './modules/prisma/prisma.module';
import { TrpcModule } from './modules/trpc/trpc.module';
import { AiModule } from './modules/ai/ai.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { RepositoryModule } from './modules/repository/repository.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    RepositoryModule,
    AiModule,
    ConversationsModule,
    TasksModule,
    TrpcModule,
  ],
})
export class AppModule {}