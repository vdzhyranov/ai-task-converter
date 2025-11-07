import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';

export interface FileContent {
  path: string;
  content: string;
  sha: string;
  size: number;
}

export interface TreeNode {
  path: string;
  type: 'file' | 'dir';
  sha: string;
  size?: number;
}

@Injectable()
export class GithubClient {
  private readonly logger = new Logger(GithubClient.name);
  private readonly octokit: InstanceType<typeof Octokit>;
  private readonly owner: string;
  private readonly repo: string;
  private readonly defaultBranch: string;

  constructor(private readonly configService: ConfigService) {
    const repositoryUrl = this.configService.get<string>(
      'repository.github.repositoryUrl',
    );
    const accessToken = this.configService.get<string>(
      'repository.github.accessToken',
    );
    this.defaultBranch =
      this.configService.get<string>('repository.github.defaultBranch') ||
      'main';

    if (!repositoryUrl || !accessToken) {
      throw new Error(
        'GitHub repository configuration missing. Set GITHUB_REPOSITORY_URL and GITHUB_ACCESS_TOKEN',
      );
    }

    // Parse owner/repo from URL
    const match = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub repository URL: ${repositoryUrl}`);
    }

    this.owner = match[1];
    this.repo = match[2].replace(/\.git$/, '');

    this.octokit = new Octokit({ auth: accessToken });
    this.logger.log(`GitHub client initialized for ${this.owner}/${this.repo}`);
  }

  /**
   * Get file content from repository with retry logic
   */
  async getFileContent(
    path: string,
    ref?: string,
  ): Promise<FileContent | null> {
    return this.executeWithRetry(async () => {
      try {
        const response = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path,
          ref: ref || this.defaultBranch,
        });

        if (Array.isArray(response.data) || response.data.type !== 'file') {
          this.logger.warn(`Path ${path} is not a file`);
          return null;
        }

        const content = Buffer.from(
          response.data.content,
          'base64',
        ).toString('utf-8');

        return {
          path: response.data.path,
          content,
          sha: response.data.sha,
          size: response.data.size,
        };
      } catch (error) {
        // Handle specific errors
        if (error.status === 401 || error.status === 403) {
          this.logger.error(
            `Authentication failed for ${this.owner}/${this.repo}. Check GITHUB_ACCESS_TOKEN`,
          );
          throw new Error(
            'GitHub authentication failed. Please verify your access token.',
          );
        }

        if (error.status === 404) {
          this.logger.warn(`File not found: ${path}`);
          return null;
        }

        throw error;
      }
    });
  }

  /**
   * Execute API call with exponential backoff retry for rate limiting
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 5,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Rate limit handling (GitHub returns 403 with specific headers)
        if (
          error.status === 403 &&
          error.response?.headers?.['x-ratelimit-remaining'] === '0'
        ) {
          const resetTime = error.response.headers['x-ratelimit-reset'];
          const waitTime = resetTime
            ? (parseInt(resetTime) * 1000 - Date.now()) / 1000
            : Math.pow(2, attempt) * 1000;

          this.logger.warn(
            `Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)}s before retry ${attempt + 1}/${maxRetries}`,
          );

          if (attempt < maxRetries - 1) {
            await this.sleep(waitTime);
            continue;
          }
        }

        // Other retryable errors (5xx server errors)
        if (error.status >= 500 && attempt < maxRetries - 1) {
          const backoffTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn(
            `Server error (${error.status}). Retrying in ${backoffTime / 1000}s...`,
          );
          await this.sleep(backoffTime);
          continue;
        }

        // Non-retryable error or max retries reached
        throw error;
      }
    }

    throw lastError || new Error('Unknown error occurred during retry');
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get directory tree (file listing) with retry logic
   */
  async getFileTree(
    path: string = '',
    recursive: boolean = true,
  ): Promise<TreeNode[]> {
    return this.executeWithRetry(async () => {
      try {
        this.octokit
        const response = await this.octokit.git.getTree({
          owner: this.owner,
          repo: this.repo,
          tree_sha: this.defaultBranch,
          recursive: recursive ? 'true' : undefined,
        });

        return response.data.tree
          .filter((item) => {
            // Filter by path if specified
            if (path && !item.path.startsWith(path)) {
              return false;
            }
            return item.type === 'blob' || item.type === 'tree';
          })
          .map((item) => ({
            path: item.path,
            type: item.type === 'blob' ? 'file' : 'dir',
            sha: item.sha,
            size: item.size,
          }));
      } catch (error) {
        // Handle authentication errors
        if (error.status === 401 || error.status === 403) {
          this.logger.error(
            `Authentication failed for ${this.owner}/${this.repo}`,
          );
          throw new Error(
            'GitHub authentication failed. Please verify your access token.',
          );
        }

        this.logger.error(`Failed to get file tree: ${error.message}`);
        throw error;
      }
    });
  }
}