import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { RepositoryService } from './repository.service';
import { GithubClient } from './clients/github.client';
import { ContextDetectorService } from './context-detector.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [RepositoryService, GithubClient, ContextDetectorService],
  exports: [RepositoryService, ContextDetectorService],
})
export class RepositoryModule {}