import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import {
  QUESTION_GENERATION_PROMPT,
  REQUIREMENTS_SUMMARY_PROMPT,
  TASK_GENERATION_PROMPT,
} from "./prompts";
import { RepositoryService } from "../repository/repository.service";
import { ContextDetectorService } from "../repository/context-detector.service";

interface QuestionAnswer {
  question: string;
  answer: string;
}

interface GeneratedTasks {
  design: Task[];
  frontend: Task[];
  backend: Task[];
}

interface Task {
  description: string;
  acceptanceCriteria: string[];
  priority?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic;
  private readonly model = "claude-3-haiku-20240307";
  private readonly maxTokens = 4096;
  private readonly temperature = 0.3;

  constructor(
    private readonly configService: ConfigService,
    private readonly repositoryService: RepositoryService,
    private readonly contextDetector: ContextDetectorService,
  ) {
    const apiKey = this.configService.get<string>("anthropic.apiKey");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Generate a clarifying question based on feature description and previous Q&A
   * @param featureDescription - The initial feature description from the user
   * @param previousQA - Array of previous questions and answers
   * @param questionCount - Current question count (0-5)
   * @returns A clarifying question string
   */
  async generateClarifyingQuestion(
    featureDescription: string,
    previousQA: QuestionAnswer[],
    questionCount: number
  ): Promise<string> {
    try {
      const qaContext = previousQA
        .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`)
        .join("\n\n");

      console.log(1);
      const userMessage = `Feature Description: ${featureDescription}
      
${qaContext ? `Previous Q&A:\n${qaContext}\n\n` : ""}Question ${questionCount + 1} of 5:
Generate ONE specific clarifying question to help understand the requirements better.`;
      console.log(2);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        temperature: this.temperature,
        system: QUESTION_GENERATION_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });
      console.log(3);

      const firstContent = response.content[0];
      if (firstContent.type !== "text") {
        throw new Error("Unexpected response format from Claude API");
      }
      const question = firstContent.text.trim();
      this.logger.log(
        `Generated question ${questionCount + 1}: ${question.substring(0, 50)}...`
      );

      console.log(4);

      return question;
    } catch (error) {
      this.logger.error("Error generating clarifying question", error);
      throw new Error("Failed to generate clarifying question");
    }
  }

  /**
   * Generate requirements summary based on feature description and Q&A
   * @param featureDescription - The initial feature description
   * @param conversationHistory - All questions and answers
   * @returns Requirements summary for user approval
   */
  async generateRequirementsSummary(
    featureDescription: string,
    conversationHistory: QuestionAnswer[]
  ): Promise<string> {
    try {
      const qaContext = conversationHistory
        .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`)
        .join("\n\n");

      const userMessage = `Feature Description: ${featureDescription}

Conversation History:
${qaContext}

Based on this conversation, generate a clear requirements summary for approval.`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: REQUIREMENTS_SUMMARY_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const firstContent = response.content[0];
      if (firstContent.type !== "text") {
        throw new Error("Unexpected response format from Claude API");
      }
      const summary = firstContent.text.trim();
      this.logger.log(
        `Generated requirements summary: ${summary.substring(0, 100)}...`
      );
      return summary;
    } catch (error) {
      this.logger.error("Error generating requirements summary", error);
      throw new Error("Failed to generate requirements summary");
    }
  }

  /**
   * Generate structured tasks based on approved requirements
   * @param requirementsSummary - The approved requirements summary
   * @returns Tasks organized by department (design, frontend, backend)
   */
  async generateTasks(requirementsSummary: string): Promise<GeneratedTasks> {
    try {
      const userMessage = `Requirements Summary:
${requirementsSummary}

Generate structured tasks for Design, Frontend, and Backend teams. Return JSON only.`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: TASK_GENERATION_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const firstContent = response.content[0];
      if (firstContent.type !== "text") {
        throw new Error("Unexpected response format from Claude API");
      }
      const content = firstContent.text.trim();

      // Extract JSON from code blocks if present
      let jsonContent = content;
      if (content.includes("```json")) {
        const match = content.match(/```json\n([\s\S]*?)\n```/);
        if (match) {
          jsonContent = match[1];
        }
      } else if (content.includes("```")) {
        const match = content.match(/```\n([\s\S]*?)\n```/);
        if (match) {
          jsonContent = match[1];
        }
      }

      const tasks: GeneratedTasks = JSON.parse(jsonContent);

      // Validate structure
      if (
        !tasks.design ||
        !tasks.frontend ||
        !tasks.backend ||
        !Array.isArray(tasks.design) ||
        !Array.isArray(tasks.frontend) ||
        !Array.isArray(tasks.backend)
      ) {
        throw new Error("Invalid task structure returned by AI");
      }

      this.logger.log(
        `Generated tasks: ${tasks.design.length} design, ${tasks.frontend.length} frontend, ${tasks.backend.length} backend`
      );
      return tasks;
    } catch (error) {
      this.logger.error("Error generating tasks", error);
      throw new Error("Failed to generate tasks");
    }
  }

  /**
   * Generate structured tasks with repository context
   * @param requirementsSummary - The approved requirements summary
   * @param featureDescription - The original feature description for context detection
   * @returns Tasks organized by department and the list of context file paths used
   */
  async generateTasksWithContext(
    requirementsSummary: string,
    featureDescription: string,
  ): Promise<{ tasks: GeneratedTasks; contextPaths: string[] }> {
    try {
      this.logger.log("Generating tasks with repository context");

      // Get file tree from repository
      const fileTree = await this.repositoryService.getFileTree(undefined, true);
      this.logger.debug(`Retrieved file tree: ${fileTree.length} files`);

      // Detect relevant files based on feature description
      const maxContextFiles =
        this.configService.get<number>("repository.cache.maxContextFiles") || 50;
      const scoredFiles = this.contextDetector.detectRelevantFiles(
        fileTree,
        featureDescription,
        maxContextFiles,
      );
      this.logger.log(
        `Detected ${scoredFiles.length} relevant files for context`,
      );

      // Build context string from scored files
      const { contextString, filePaths } =
        await this.repositoryService.buildContext(scoredFiles);

      if (!contextString) {
        this.logger.warn(
          "No context retrieved, falling back to generateTasks without context",
        );
        const tasks = await this.generateTasks(requirementsSummary);
        return { tasks, contextPaths: [] };
      }

      // Generate tasks with repository context prepended
      const userMessage = `${contextString}

---

Requirements Summary:
${requirementsSummary}

Generate structured tasks for Design, Frontend, and Backend teams. Return JSON only.`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: TASK_GENERATION_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const firstContent = response.content[0];
      if (firstContent.type !== "text") {
        throw new Error("Unexpected response format from Claude API");
      }
      const content = firstContent.text.trim();

      // Extract JSON from code blocks if present
      let jsonContent = content;
      if (content.includes("```json")) {
        const match = content.match(/```json\n([\s\S]*?)\n```/);
        if (match) {
          jsonContent = match[1];
        }
      } else if (content.includes("```")) {
        const match = content.match(/```\n([\s\S]*?)\n```/);
        if (match) {
          jsonContent = match[1];
        }
      }

      const tasks: GeneratedTasks = JSON.parse(jsonContent);

      // Validate structure
      if (
        !tasks.design ||
        !tasks.frontend ||
        !tasks.backend ||
        !Array.isArray(tasks.design) ||
        !Array.isArray(tasks.frontend) ||
        !Array.isArray(tasks.backend)
      ) {
        throw new Error("Invalid task structure returned by AI");
      }

      this.logger.log(
        `Generated tasks with context: ${tasks.design.length} design, ${tasks.frontend.length} frontend, ${tasks.backend.length} backend (using ${filePaths.length} context files)`,
      );

      return { tasks, contextPaths: filePaths };
    } catch (error) {
      this.logger.error("Error generating tasks with context", error);
      throw new Error("Failed to generate tasks with context");
    }
  }
}
