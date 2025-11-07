import repositoryConfig from "./repository.config";

export default () => ({
  port: parseInt(process.env.PORT!, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3001"],
  },
  github: {
    repositoryUrl: process.env.GITHUB_REPOSITORY_URL || "",
    accessToken: process.env.GITHUB_ACCESS_TOKEN || "",
    defaultBranch: process.env.REPOSITORY_DEFAULT_BRANCH || "develop",
  },
  cache: {
    ttlMinutes: parseInt(process.env.REPOSITORY_CACHE_TTL_MINUTES || "60", 10),
    maxContextFiles: parseInt(
      process.env.REPOSITORY_MAX_CONTEXT_FILES || "50",
      10
    ),
  },
});
