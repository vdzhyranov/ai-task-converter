import { Injectable, Logger } from '@nestjs/common';
import { TreeNode } from './clients/github.client';

export interface ScoredFile {
  path: string;
  score: number;
  reasons: string[];
}

/**
 * Detects relevant repository files based on feature description
 * Uses keyword extraction, directory prioritization, and file type filtering
 */
@Injectable()
export class ContextDetectorService {
  private readonly logger = new Logger(ContextDetectorService.name);

  // High-priority directories that are more likely to contain relevant code
  private readonly PRIORITY_DIRECTORIES = [
    'src/modules/',
    'src/common/',
    'src/config/',
    'prisma/',
    'backend/src/modules/',
    'backend/src/common/',
    'backend/src/config/',
    'backend/prisma/',
  ];

  // File extensions to consider for context
  private readonly RELEVANT_EXTENSIONS = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.prisma',
    '.json',
    '.md',
  ];

  // Files to always exclude
  private readonly EXCLUDED_PATTERNS = [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    'coverage/',
    '.git/',
    'pnpm-lock',
    'package-lock',
    'yarn.lock',
  ];

  /**
   * Extract keywords from feature description
   * Removes stop words and extracts meaningful technical terms
   */
  extractKeywords(description: string): string[] {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'should',
      'could',
      'may',
      'might',
      'must',
      'can',
      'need',
      'want',
      'i',
      'we',
      'you',
      'they',
      'it',
      'this',
      'that',
      'these',
      'those',
    ]);

    // Extract words, convert to lowercase, remove stop words
    const words = description
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    // Remove duplicates and return
    return [...new Set(words)];
  }

  /**
   * Calculate priority score based on directory location
   */
  private calculateDirectoryScore(path: string): number {
    let score = 0;

    for (const priorityDir of this.PRIORITY_DIRECTORIES) {
      if (path.startsWith(priorityDir)) {
        score += 20;
        break;
      }
    }

    // Bonus for being in root src/
    if (path.startsWith('src/') || path.startsWith('backend/src/')) {
      score += 10;
    }

    return score;
  }

  /**
   * Check if file type is relevant
   */
  private isRelevantFileType(path: string): boolean {
    return this.RELEVANT_EXTENSIONS.some((ext) => path.endsWith(ext));
  }

  /**
   * Check if file should be excluded
   */
  private shouldExcludeFile(path: string): boolean {
    return this.EXCLUDED_PATTERNS.some((pattern) => path.includes(pattern));
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordScore(path: string, keywords: string[]): number {
    let score = 0;
    const lowerPath = path.toLowerCase();

    for (const keyword of keywords) {
      if (lowerPath.includes(keyword)) {
        score += 15;
      }
    }

    return score;
  }

  /**
   * Detect relevant files from repository tree based on feature description
   * Returns scored list of files sorted by relevance
   */
  detectRelevantFiles(
    fileTree: TreeNode[],
    featureDescription: string,
    maxFiles: number = 50,
  ): ScoredFile[] {
    this.logger.debug(
      `Detecting relevant files for: ${featureDescription.substring(0, 100)}...`,
    );

    const keywords = this.extractKeywords(featureDescription);
    this.logger.debug(`Extracted keywords: ${keywords.join(', ')}`);

    const scoredFiles: ScoredFile[] = [];

    for (const node of fileTree) {
      // Skip directories and excluded files
      if (node.type === 'dir' || this.shouldExcludeFile(node.path)) {
        continue;
      }

      // Skip non-relevant file types
      if (!this.isRelevantFileType(node.path)) {
        continue;
      }

      const reasons: string[] = [];
      let score = 0;

      // Directory prioritization
      const dirScore = this.calculateDirectoryScore(node.path);
      if (dirScore > 0) {
        score += dirScore;
        reasons.push(`priority directory (+${dirScore})`);
      }

      // Keyword matching
      const keywordScore = this.calculateKeywordScore(node.path, keywords);
      if (keywordScore > 0) {
        score += keywordScore;
        reasons.push(`keyword match (+${keywordScore})`);
      }

      // Base score for being a relevant file type
      if (reasons.length === 0) {
        score += 5;
        reasons.push('relevant file type (+5)');
      }

      if (score > 0) {
        scoredFiles.push({
          path: node.path,
          score,
          reasons,
        });
      }
    }

    // Sort by score descending and limit
    const sorted = scoredFiles.sort((a, b) => b.score - a.score).slice(0, maxFiles);

    this.logger.log(
      `Detected ${sorted.length} relevant files (top score: ${sorted[0]?.score || 0})`,
    );

    return sorted;
  }
}