import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Octokit } from "@octokit/rest";

export interface FileContent {
  path: string;
  content: string;
  sha: string;
  size: number;
}

export interface TreeNode {
  path: string;
  type: "file" | "dir";
  sha: string;
  size?: number;
}

interface OctokitError extends Error {
  status?: number;
  response?: {
    headers?: Record<string, string>;
  };
}

@Injectable()
export class GithubClient implements OnModuleInit {
  private readonly logger = new Logger(GithubClient.name);
  private readonly octokit: InstanceType<typeof Octokit>;
  private readonly owner: string;
  private readonly repo: string;
  private defaultBranch: string;
  private defaultBranchInitialized = false;

  constructor(private readonly configService: ConfigService) {
    const repositoryUrl = this.configService.get<string>(
      "github.repositoryUrl"
    );
    const accessToken = this.configService.get<string>("github.accessToken");
    this.defaultBranch =
      this.configService.get<string>("github.defaultBranch") || "main";

    if (!repositoryUrl || !accessToken) {
      throw new Error(
        "GitHub repository configuration missing. Set GITHUB_REPOSITORY_URL and GITHUB_ACCESS_TOKEN"
      );
    }

    // Parse owner/repo from URL
    const match = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub repository URL: ${repositoryUrl}`);
    }

    this.owner = match[1];
    this.repo = match[2].replace(/\.git$/, "");

    this.octokit = new Octokit({ auth: accessToken });
    this.logger.log(`GitHub client initialized for ${this.owner}/${this.repo}`);
  }

  async onModuleInit() {
    await this.getDefaultBranch();
  }
  /**
   * Lazily fetch and cache the actual default branch from GitHub
   */
  private async getDefaultBranch(): Promise<string> {
    // if (this.defaultBranchInitialized) {
    //   return this.defaultBranch;
    // }

    try {
      const { data: repoData } = await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo,
      });

      this.defaultBranch = repoData.default_branch;
      this.defaultBranchInitialized = true;
      this.logger.log(
        `Detected default branch: ${this.defaultBranch} for ${this.owner}/${this.repo}`
      );

      return this.defaultBranch;
    } catch (error) {
      console.log(error);
      const octokitError = error as OctokitError;
      this.logger.warn(
        `Failed to fetch default branch, using configured: ${this.defaultBranch}. Error: ${octokitError.message}`
      );
      this.defaultBranchInitialized = true;
      return this.defaultBranch;
    }
  }

  /**
   * Get file content from repository with retry logic
   */
  async getFileContent(
    path: string,
    ref?: string
  ): Promise<FileContent | null> {
    return this.executeWithRetry(async () => {
      try {
        const branch = ref || (await this.getDefaultBranch());
        const response = await this.octokit.rest.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path,
          ref: branch,
        });

        if (Array.isArray(response.data) || response.data.type !== "file") {
          this.logger.warn(`Path ${path} is not a file`);
          return null;
        }

        const content = Buffer.from(response.data.content, "base64").toString(
          "utf-8"
        );

        return {
          path: response.data.path,
          content,
          sha: response.data.sha,
          size: response.data.size,
        };
      } catch (error) {
        const octokitError = error as OctokitError;

        // Handle specific errors
        if (octokitError.status === 401 || octokitError.status === 403) {
          this.logger.error(
            `Authentication failed for ${this.owner}/${this.repo}. Check GITHUB_ACCESS_TOKEN`
          );
          throw new Error(
            "GitHub authentication failed. Please verify your access token."
          );
        }

        if (octokitError.status === 404) {
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
    maxRetries: number = 5
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const octokitError = error as OctokitError;
        lastError = octokitError;

        // Rate limit handling (GitHub returns 403 with specific headers)
        if (
          octokitError.status === 403 &&
          octokitError.response?.headers?.["x-ratelimit-remaining"] === "0"
        ) {
          const resetTime = octokitError.response.headers["x-ratelimit-reset"];
          const waitTime = resetTime
            ? (parseInt(resetTime) * 1000 - Date.now()) / 1000
            : Math.pow(2, attempt) * 1000;

          this.logger.warn(
            `Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)}s before retry ${attempt + 1}/${maxRetries}`
          );

          if (attempt < maxRetries - 1) {
            await this.sleep(waitTime);
            continue;
          }
        }

        // Other retryable errors (5xx server errors)
        if (
          octokitError.status &&
          octokitError.status >= 500 &&
          attempt < maxRetries - 1
        ) {
          const backoffTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn(
            `Server error (${octokitError.status}). Retrying in ${backoffTime / 1000}s...`
          );
          await this.sleep(backoffTime);
          continue;
        }

        // Non-retryable error or max retries reached
        throw error;
      }
    }

    throw lastError || new Error("Unknown error occurred during retry");
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
    path: string = "",
    recursive: boolean = true
  ): Promise<TreeNode[]> {
    return this.executeWithRetry(async () => {
      try {
        // Get the actual default branch
        const branch = await this.getDefaultBranch();

        // First, get the branch reference to get the commit SHA
        const refResponse = await this.octokit.rest.git.getRef({
          owner: this.owner,
          repo: this.repo,
          ref: `heads/${branch}`,
        });

        const commitSha = refResponse.data.object.sha;

        // Then get the commit to get the tree SHA
        const commitResponse = await this.octokit.rest.git.getCommit({
          owner: this.owner,
          repo: this.repo,
          commit_sha: commitSha,
        });

        const treeSha = commitResponse.data.tree.sha;

        // Finally, get the tree
        const response = await this.octokit.rest.git.getTree({
          owner: this.owner,
          repo: this.repo,
          tree_sha: treeSha,
          recursive: recursive ? "1" : undefined,
        });

        return response.data.tree
          .filter((item) => {
            // Filter by path if specified
            if (path && !item.path?.startsWith(path)) {
              return false;
            }
            return item.type === "blob" || item.type === "tree";
          })
          .map((item) => ({
            path: item.path || "",
            type: item.type === "blob" ? ("file" as const) : ("dir" as const),
            sha: item.sha || "",
            size: item.size,
          }));
      } catch (error) {
        const octokitError = error as OctokitError;

        // Handle authentication errors
        if (octokitError.status === 401 || octokitError.status === 403) {
          this.logger.error(
            `Authentication failed for ${this.owner}/${this.repo}`
          );
          throw new Error(
            "GitHub authentication failed. Please verify your access token."
          );
        }

        if (octokitError.status === 404) {
          this.logger.error(
            `Branch not found in ${this.owner}/${this.repo}. Attempted branch: ${this.defaultBranch}`
          );
          throw new Error(
            `Repository branch not found. Please check your repository configuration.`
          );
        }

        this.logger.error(`Failed to get file tree: ${octokitError.message}`);
        throw error;
      }
    });
  }
}
