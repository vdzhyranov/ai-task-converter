/**
 * Sensitive Data Filter
 * Detects and redacts sensitive information from file content
 */

export interface FilterResult {
  content: string;
  redactedCount: number;
  patterns: string[];
}

export class SensitiveDataFilter {
  // Sensitive file patterns to exclude entirely
  private static readonly EXCLUDED_FILES = [
    /\.env$/,
    /\.env\..+$/,
    /credentials\.json$/,
    /secrets\.json$/,
    /\.pem$/,
    /\.key$/,
    /\.cert$/,
    /\.pfx$/,
    /\.p12$/,
    /id_rsa$/,
    /id_dsa$/,
    /\.ssh\/config$/,
  ];

  // Regex patterns for detecting secrets in content
  private static readonly SECRET_PATTERNS = [
    {
      name: 'API_KEY',
      pattern: /(api[_-]?key|apikey)[\s:=]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
      replacement: '$1=[REDACTED:API_KEY]',
    },
    {
      name: 'TOKEN',
      pattern: /(token|bearer|auth)[\s:=]+['"]?([a-zA-Z0-9._\-]{20,})['"]?/gi,
      replacement: '$1=[REDACTED:TOKEN]',
    },
    {
      name: 'AWS_KEY',
      pattern: /AKIA[0-9A-Z]{16}/g,
      replacement: '[REDACTED:AWS_ACCESS_KEY]',
    },
    {
      name: 'PRIVATE_KEY',
      pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
      replacement: '[REDACTED:PRIVATE_KEY]',
    },
    {
      name: 'PASSWORD',
      pattern: /(password|passwd|pwd)[\s:=]+['"]?([^\s'"]{8,})['"]?/gi,
      replacement: '$1=[REDACTED:PASSWORD]',
    },
    {
      name: 'CONNECTION_STRING',
      pattern: /(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@/gi,
      replacement: '$1://[REDACTED:CREDENTIALS]@',
    },
    {
      name: 'GITHUB_TOKEN',
      pattern: /gh[ps]_[a-zA-Z0-9]{36}/g,
      replacement: '[REDACTED:GITHUB_TOKEN]',
    },
    {
      name: 'SLACK_TOKEN',
      pattern: /xox[baprs]-[a-zA-Z0-9-]+/g,
      replacement: '[REDACTED:SLACK_TOKEN]',
    },
    {
      name: 'JWT',
      pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
      replacement: '[REDACTED:JWT]',
    },
  ];

  /**
   * Check if a file path should be excluded entirely
   */
  static shouldExcludeFile(path: string): boolean {
    return this.EXCLUDED_FILES.some((pattern) => pattern.test(path));
  }

  /**
   * Filter sensitive content from file
   */
  static filterContent(content: string): FilterResult {
    let filtered = content;
    let redactedCount = 0;
    const detectedPatterns: string[] = [];

    for (const { name, pattern, replacement } of this.SECRET_PATTERNS) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        redactedCount += matches.length;
        detectedPatterns.push(name);
        filtered = filtered.replace(pattern, replacement);
      }
    }

    return {
      content: filtered,
      redactedCount,
      patterns: [...new Set(detectedPatterns)],
    };
  }

  /**
   * Check if content contains sensitive data (without filtering)
   */
  static containsSensitiveData(content: string): boolean {
    return this.SECRET_PATTERNS.some(({ pattern }) => pattern.test(content));
  }
}