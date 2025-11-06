import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { ConversationStatus, MessageRole, MessageType } from "@prisma/client";
import {
  CreateConversationDto,
  AnswerQuestionDto,
  ApproveRequirementsDto,
  RejectRequirementsDto,
} from "./dto";

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  private readonly MAX_QUESTIONS = 5;
  private readonly MIN_QUESTIONS = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService
  ) {}

  /**
   * Create a new conversation with initial feature description
   * Generates the first clarifying question
   */
  async create(dto: CreateConversationDto) {
    try {
      // Create conversation
      const conversation = await this.prisma.conversation.create({
        data: {
          featureDescription: dto.featureDescription,
          questionCount: 0,
          status: ConversationStatus.ASKING_QUESTIONS,
          assumptions: [],
        },
      });

      // Save user's feature description message
      await this.prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: MessageRole.USER,
          messageType: MessageType.FEATURE_DESCRIPTION,
          content: dto.featureDescription,
          order: 0,
        },
      });

      // Generate first clarifying question
      const question = await this.aiService.generateClarifyingQuestion(
        dto.featureDescription,
        [],
        0
      );

      // Save AI's question message
      const questionMessage = await this.prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: MessageRole.ASSISTANT,
          messageType: MessageType.CLARIFYING_QUESTION,
          content: question,
          order: 1,
        },
      });

      // Update question count
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { questionCount: 1 },
      });

      this.logger.log(
        `Created conversation ${conversation.id} with first question`
      );

      return {
        conversationId: conversation.id,
        status: conversation.status,
        questionCount: 1,
        question: {
          id: questionMessage.id,
          content: questionMessage.content,
          order: questionMessage.order,
        },
      };
    } catch (error) {
      this.logger.error("Error creating conversation", error);
      throw new BadRequestException("Failed to create conversation");
    }
  }

  /**
   * Answer a question - either generates next question or requirements summary
   */
  async answerQuestion(dto: AnswerQuestionDto) {
    const conversation = await this.findConversation(dto.conversationId);

    if (conversation.status !== ConversationStatus.ASKING_QUESTIONS) {
      throw new BadRequestException(
        `Cannot answer question in status: ${conversation.status}`
      );
    }

    try {
      // Get all messages
      const messages = await this.prisma.conversationMessage.findMany({
        where: { conversationId: dto.conversationId },
        orderBy: { order: "asc" },
      });

      const nextOrder = messages.length;

      // Save user's answer
      await this.prisma.conversationMessage.create({
        data: {
          conversationId: dto.conversationId,
          role: MessageRole.USER,
          messageType: MessageType.ANSWER,
          content: dto.answer,
          order: nextOrder,
        },
      });

      // Build Q&A history
      const qaHistory = this.buildQAHistory(messages, dto.answer);

      // Decide: ask another question or generate requirements summary
      const shouldGenerateRequirements =
        conversation.questionCount >= this.MAX_QUESTIONS ||
        (conversation.questionCount >= this.MIN_QUESTIONS &&
          this.hasSufficientInformation(qaHistory));

      if (shouldGenerateRequirements) {
        // Generate requirements summary
        const requirementsSummary =
          await this.aiService.generateRequirementsSummary(
            conversation.featureDescription,
            qaHistory
          );

        // Save requirements summary message
        const summaryMessage = await this.prisma.conversationMessage.create({
          data: {
            conversationId: dto.conversationId,
            role: MessageRole.ASSISTANT,
            messageType: MessageType.REQUIREMENTS_SUMMARY,
            content: requirementsSummary,
            order: nextOrder + 1,
          },
        });

        // Update conversation status
        await this.prisma.conversation.update({
          where: { id: dto.conversationId },
          data: {
            status: ConversationStatus.AWAITING_APPROVAL,
            requirementsSummary,
          },
        });

        this.logger.log(
          `Generated requirements summary for conversation ${dto.conversationId}`
        );

        return {
          status: ConversationStatus.AWAITING_APPROVAL,
          requirementsSummary: {
            id: summaryMessage.id,
            content: summaryMessage.content,
            order: summaryMessage.order,
          },
        };
      } else {
        // Generate next question
        const nextQuestion = await this.aiService.generateClarifyingQuestion(
          conversation.featureDescription,
          qaHistory,
          conversation.questionCount
        );

        const questionMessage = await this.prisma.conversationMessage.create({
          data: {
            conversationId: dto.conversationId,
            role: MessageRole.ASSISTANT,
            messageType: MessageType.CLARIFYING_QUESTION,
            content: nextQuestion,
            order: nextOrder + 1,
          },
        });

        // Increment question count
        const newQuestionCount = conversation.questionCount + 1;
        await this.prisma.conversation.update({
          where: { id: dto.conversationId },
          data: { questionCount: newQuestionCount },
        });

        this.logger.log(
          `Generated question ${newQuestionCount} for conversation ${dto.conversationId}`
        );

        return {
          status: ConversationStatus.ASKING_QUESTIONS,
          questionCount: newQuestionCount,
          question: {
            id: questionMessage.id,
            content: questionMessage.content,
            order: questionMessage.order,
          },
        };
      }
    } catch (error) {
      this.logger.error("Error answering question", error);
      throw new BadRequestException("Failed to process answer");
    }
  }

  /**
   * Approve requirements - triggers task generation
   */
  async approveRequirements(dto: ApproveRequirementsDto) {
    const conversation = await this.findConversation(dto.conversationId);

    if (conversation.status !== ConversationStatus.AWAITING_APPROVAL) {
      throw new BadRequestException(
        `Cannot approve requirements in status: ${conversation.status}`
      );
    }

    if (!conversation.requirementsSummary) {
      throw new BadRequestException("No requirements summary found");
    }

    try {
      const messages = await this.prisma.conversationMessage.findMany({
        where: { conversationId: dto.conversationId },
        orderBy: { order: "asc" },
      });

      const nextOrder = messages.length;

      // Save approval message
      await this.prisma.conversationMessage.create({
        data: {
          conversationId: dto.conversationId,
          role: MessageRole.USER,
          messageType: MessageType.APPROVAL,
          content: "Requirements approved",
          order: nextOrder,
        },
      });

      // Update status to generating tasks
      await this.prisma.conversation.update({
        where: { id: dto.conversationId },
        data: { status: ConversationStatus.GENERATING_TASKS },
      });

      // Generate tasks (this will be called by TasksService)
      this.logger.log(
        `Requirements approved for conversation ${dto.conversationId}`
      );

      return {
        status: ConversationStatus.GENERATING_TASKS,
        message: "Generating tasks...",
      };
    } catch (error) {
      this.logger.error("Error approving requirements", error);
      throw new BadRequestException("Failed to approve requirements");
    }
  }

  /**
   * Reject requirements - returns to questioning
   */
  async rejectRequirements(dto: RejectRequirementsDto) {
    const conversation = await this.findConversation(dto.conversationId);

    if (conversation.status !== ConversationStatus.AWAITING_APPROVAL) {
      throw new BadRequestException(
        `Cannot reject requirements in status: ${conversation.status}`
      );
    }

    try {
      const messages = await this.prisma.conversationMessage.findMany({
        where: { conversationId: dto.conversationId },
        orderBy: { order: "asc" },
      });

      const nextOrder = messages.length;

      // Save rejection message
      const rejectionContent = dto.reason
        ? `Requirements rejected: ${dto.reason}`
        : "Requirements rejected";

      await this.prisma.conversationMessage.create({
        data: {
          conversationId: dto.conversationId,
          role: MessageRole.USER,
          messageType: MessageType.REJECTION,
          content: rejectionContent,
          order: nextOrder,
        },
      });

      // Generate a follow-up question based on rejection reason
      const qaHistory = this.buildQAHistoryFromMessages(messages);
      const followUpQuestion = await this.aiService.generateClarifyingQuestion(
        conversation.featureDescription,
        qaHistory,
        conversation.questionCount
      );

      const questionMessage = await this.prisma.conversationMessage.create({
        data: {
          conversationId: dto.conversationId,
          role: MessageRole.ASSISTANT,
          messageType: MessageType.CLARIFYING_QUESTION,
          content: followUpQuestion,
          order: nextOrder + 1,
        },
      });

      // Update status back to asking questions
      await this.prisma.conversation.update({
        where: { id: dto.conversationId },
        data: {
          status: ConversationStatus.ASKING_QUESTIONS,
          questionCount: conversation.questionCount + 1,
        },
      });

      this.logger.log(
        `Requirements rejected for conversation ${dto.conversationId}, asking follow-up question`
      );

      return {
        status: ConversationStatus.ASKING_QUESTIONS,
        questionCount: conversation.questionCount + 1,
        question: {
          id: questionMessage.id,
          content: questionMessage.content,
          order: questionMessage.order,
        },
      };
    } catch (error) {
      this.logger.error("Error rejecting requirements", error);
      throw new BadRequestException("Failed to reject requirements");
    }
  }

  /**
   * Get conversation details with messages and tasks
   */
  async getConversationDetail(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { order: "asc" },
        },
        tasks: {
          orderBy: [{ department: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    return conversation;
  }

  /**
   * Helper: Find conversation by ID or throw error
   */
  private async findConversation(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    return conversation;
  }

  /**
   * Helper: Build Q&A history from messages
   */
  private buildQAHistory(
    messages: any[],
    latestAnswer: string
  ): Array<{ question: string; answer: string }> {
    const qaHistory: Array<{ question: string; answer: string }> = [];
    let currentQuestion: string | null = null;

    for (const message of messages) {
      if (message.messageType === MessageType.CLARIFYING_QUESTION) {
        currentQuestion = message.content;
      } else if (
        message.messageType === MessageType.ANSWER &&
        currentQuestion
      ) {
        qaHistory.push({
          question: currentQuestion,
          answer: message.content,
        });
        currentQuestion = null;
      }
    }

    // Add the latest answer if there's a pending question
    if (currentQuestion) {
      qaHistory.push({
        question: currentQuestion,
        answer: latestAnswer,
      });
    }

    return qaHistory;
  }

  /**
   * Helper: Build Q&A history from existing messages only
   */
  private buildQAHistoryFromMessages(
    messages: any[]
  ): Array<{ question: string; answer: string }> {
    const qaHistory: Array<{ question: string; answer: string }> = [];
    let currentQuestion: string | null = null;

    for (const message of messages) {
      if (message.messageType === MessageType.CLARIFYING_QUESTION) {
        currentQuestion = message.content;
      } else if (
        message.messageType === MessageType.ANSWER &&
        currentQuestion
      ) {
        qaHistory.push({
          question: currentQuestion,
          answer: message.content,
        });
        currentQuestion = null;
      }
    }

    return qaHistory;
  }

  /**
   * Helper: Determine if we have enough information (simple heuristic)
   */
  private hasSufficientInformation(
    qaHistory: Array<{ question: string; answer: string }>
  ): boolean {
    // Simple heuristic: if we have at least MIN_QUESTIONS answers with reasonable length
    if (qaHistory.length < this.MIN_QUESTIONS) {
      return false;
    }

    // Check if answers are reasonably detailed (average >20 characters)
    const totalLength = qaHistory.reduce(
      (sum, qa) => sum + qa.answer.length,
      0
    );
    const avgLength = totalLength / qaHistory.length;

    return avgLength > 20;
  }
}
