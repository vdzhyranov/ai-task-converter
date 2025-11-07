import { registerAs } from '@nestjs/config';

export default registerAs('repository', () => ({
  github: {
    repositoryUrl: process.env.GITHUB_REPOSITORY_URL || '',
    accessToken: process.env.GITHUB_ACCESS_TOKEN || '',
    defaultBranch: process.env.REPOSITORY_DEFAULT_BRANCH || 'main',
  },
  cache: {
    ttlMinutes: parseInt(process.env.REPOSITORY_CACHE_TTL_MINUTES || '60', 10),
    maxContextFiles: parseInt(process.env.REPOSITORY_MAX_CONTEXT_FILES || '50', 10),
  },
}));