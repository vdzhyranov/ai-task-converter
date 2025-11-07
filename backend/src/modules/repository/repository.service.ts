import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GithubClient, FileContent } from './clients/github.client';
import { SensitiveDataFilter } from '../../common/filters/sensitive-data.filter';
import { ScoredFile } from './context-detector.service';

export interface CachedFile {
  path: string;
  content: string;
  sha: string;
  size: number;
  fromCache: boolean;
}

@Injectable()
export class RepositoryService {
  private readonly logger = new Logger(RepositoryService.name);
  private readonly cacheTTLMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubClient,
    private readonly configService: ConfigService,
  ) {
    this.cacheTTLMinutes = this.configService.get<number>(
      'repository.cache.ttlMinutes',
    ) || 60;
  }

  /**
   * Get file content with cache lookup
   */
  async getFile(path: string, ref?: string): Promise<CachedFile | null> {
    // Try cache first
    const cached = await this.getCachedFile(path, ref);
    if (cached) {
      this.logger.debug(`Cache hit for ${path}`);
      await this.updateCacheHit(cached.path, cached.sha);
      return { ...cached, fromCache: true };
    }

    // Fetch from GitHub and cache
    this.logger.debug(`Cache miss for ${path}, fetching from GitHub`);
    return await this.fetchAndCacheFile(path, ref);
  }

  /**
   * Cache lookup logic
   */
  private async getCachedFile(
    path: string,
    ref?: string,
  ): Promise<CachedFile | null> {
    const cached = await this.prisma.repositoryCache.findFirst({
      where: {
        path,
        expiresAt: { gt: new Date() },
      },
      orderBy: { cachedAt: 'desc' },
    });

    if (!cached) {
      return null;
    }

    return {
      path: cached.path,
      content: cached.content,
      sha: cached.sha,
      size: cached.size,
      fromCache: true,
    };
  }

  /**
   * Update cache hit count and last accessed time
   */
  private async updateCacheHit(path: string, sha: string): Promise<void> {
    await this.prisma.repositoryCache.updateMany({
      where: { path, sha },
      data: {
        hitCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }

  /**
   * Fetch file from GitHub and cache it
   */
  async fetchAndCacheFile(
    path: string,
    ref?: string,
  ): Promise<CachedFile | null> {
    // Check if file should be excluded (sensitive files)
    if (SensitiveDataFilter.shouldExcludeFile(path)) {
      this.logger.warn(`Excluded sensitive file: ${path}`);
      return null;
    }

    const fileContent = await this.github.getFileContent(path, ref);

    if (!fileContent) {
      return null;
    }

    // Filter sensitive content
    const filterResult = SensitiveDataFilter.filterContent(fileContent.content);

    if (filterResult.redactedCount > 0) {
      this.logger.warn(
        `Redacted ${filterResult.redactedCount} sensitive patterns in ${path}: ${filterResult.patterns.join(', ')}`,
      );
    }

    // Cache the filtered file
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.cacheTTLMinutes);

    await this.prisma.repositoryCache.upsert({
      where: {
        path_sha: {
          path: fileContent.path,
          sha: fileContent.sha,
        },
      },
      create: {
        path: fileContent.path,
        content: filterResult.content, // Use filtered content
        sha: fileContent.sha,
        size: filterResult.content.length, // Update size
        expiresAt,
      },
      update: {
        expiresAt, // Refresh TTL
        lastAccessedAt: new Date(),
      },
    });

    this.logger.log(`Cached file: ${path} (SHA: ${fileContent.sha})`);

    return {
      ...fileContent,
      content: filterResult.content, // Return filtered content
      size: filterResult.content.length,
      fromCache: false,
    };
  }

  /**
   * Fetch multiple files in batch
   */
  async getBulkFiles(paths: string[]): Promise<CachedFile[]> {
    const results = await Promise.all(
      paths.map((path) => this.getFile(path).catch((err) => {
        this.logger.warn(`Failed to fetch ${path}: ${err.message}`);
        return null;
      })),
    );

    return results.filter((file): file is CachedFile => file !== null);
  }

  /**
   * Get file tree from GitHub
   */
  async getFileTree(path?: string, recursive?: boolean) {
    return await this.github.getFileTree(path, recursive);
  }

  /**
   * Build formatted context from scored files for Claude
   * Fetches file contents and formats them in a readable way
   */
  async buildContext(scoredFiles: ScoredFile[]): Promise<{
    contextString: string;
    filePaths: string[];
  }> {
    this.logger.log(`Building context from ${scoredFiles.length} files`);

    const filePaths = scoredFiles.map((sf) => sf.path);
    const files = await this.getBulkFiles(filePaths);

    if (files.length === 0) {
      this.logger.warn('No files retrieved for context');
      return { contextString: '', filePaths: [] };
    }

    // Build formatted context string
    const contextParts: string[] = [
      '# Repository Context',
      '',
      `The following ${files.length} files from the repository are relevant to this feature:`,
      '',
    ];

    for (const file of files) {
      const scoredFile = scoredFiles.find((sf) => sf.path === file.path);
      const reasons = scoredFile?.reasons.join(', ') || 'relevant';

      contextParts.push(`## File: ${file.path}`);
      contextParts.push(`**Relevance**: ${reasons}`);
      contextParts.push(`**Size**: ${file.size} bytes`);
      contextParts.push('');
      contextParts.push('```');
      contextParts.push(file.content);
      contextParts.push('```');
      contextParts.push('');
    }

    contextParts.push('---');
    contextParts.push('');
    contextParts.push(
      'Please use the above repository context to generate tasks that are consistent with the existing codebase architecture and patterns.',
    );
    contextParts.push('');

    const contextString = contextParts.join('\n');

    this.logger.log(
      `Built context: ${contextString.length} chars from ${files.length} files`,
    );

    return {
      contextString,
      filePaths: files.map((f) => f.path),
    };
  }
}