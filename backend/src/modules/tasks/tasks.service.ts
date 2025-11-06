import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ConversationStatus, Department } from '@prisma/client';
import { TasksByDepartment } from './dto/task.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Generate tasks for a conversation with approved requirements
   */
  async generateTasks(conversationId: string): Promise<TasksByDepartment> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.status !== ConversationStatus.GENERATING_TASKS) {
      throw new BadRequestException(
        `Cannot generate tasks in status: ${conversation.status}`,
      );
    }

    if (!conversation.requirementsSummary) {
      throw new BadRequestException('No requirements summary found');
    }

    try {
      this.logger.log(`Generating tasks for conversation ${conversationId}`);

      // Call AI service to generate tasks
      const generatedTasks = await this.aiService.generateTasks(
        conversation.requirementsSummary,
      );

      // Store tasks in database
      const taskRecords = [];

      // Design tasks
      for (const task of generatedTasks.design) {
        taskRecords.push({
          conversationId,
          department: Department.DESIGN,
          description: task.description,
          acceptanceCriteria: task.acceptanceCriteria,
          priority: task.priority || null,
        });
      }

      // Frontend tasks
      for (const task of generatedTasks.frontend) {
        taskRecords.push({
          conversationId,
          department: Department.FRONTEND,
          description: task.description,
          acceptanceCriteria: task.acceptanceCriteria,
          priority: task.priority || null,
        });
      }

      // Backend tasks
      for (const task of generatedTasks.backend) {
        taskRecords.push({
          conversationId,
          department: Department.BACKEND,
          description: task.description,
          acceptanceCriteria: task.acceptanceCriteria,
          priority: task.priority || null,
        });
      }

      // Bulk insert tasks
      await this.prisma.task.createMany({
        data: taskRecords,
      });

      // Fetch created tasks
      const createdTasks = await this.prisma.task.findMany({
        where: { conversationId },
        orderBy: [{ department: 'asc' }, { priority: 'asc' }],
      });

      // Save task result message
      const messages = await this.prisma.conversationMessage.findMany({
        where: { conversationId },
        orderBy: { order: 'asc' },
      });

      await this.prisma.conversationMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          messageType: 'TASK_RESULT',
          content: `Generated ${createdTasks.length} tasks (${generatedTasks.design.length} design, ${generatedTasks.frontend.length} frontend, ${generatedTasks.backend.length} backend)`,
          order: messages.length,
        },
      });

      // Update conversation with generated tasks (JSONB for fast access)
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: ConversationStatus.COMPLETED,
          generatedTasks: JSON.parse(
            JSON.stringify({
              design: generatedTasks.design,
              frontend: generatedTasks.frontend,
              backend: generatedTasks.backend,
            }),
          ),
        },
      });

      this.logger.log(
        `Successfully generated ${createdTasks.length} tasks for conversation ${conversationId}`,
      );

      // Group tasks by department
      const tasksByDepartment: TasksByDepartment = {
        design: createdTasks.filter((t) => t.department === Department.DESIGN),
        frontend: createdTasks.filter(
          (t) => t.department === Department.FRONTEND,
        ),
        backend: createdTasks.filter((t) => t.department === Department.BACKEND),
      };

      return tasksByDepartment;
    } catch (error) {
      this.logger.error('Error generating tasks', error);

      // Update conversation status to failed
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { status: ConversationStatus.FAILED },
      });

      throw new BadRequestException('Failed to generate tasks');
    }
  }

  /**
   * Get tasks for a conversation
   */
  async getTasksByConversation(conversationId: string): Promise<TasksByDepartment> {
    const tasks = await this.prisma.task.findMany({
      where: { conversationId },
      orderBy: [{ department: 'asc' }, { priority: 'asc' }],
    });

    return {
      design: tasks.filter((t) => t.department === Department.DESIGN),
      frontend: tasks.filter((t) => t.department === Department.FRONTEND),
      backend: tasks.filter((t) => t.department === Department.BACKEND),
    };
  }

  /**
   * Export tasks in specified format
   */
  async exportTasks(
    conversationId: string,
    format: 'markdown' | 'json' | 'text',
    department?: Department,
  ): Promise<{ content: string; filename: string; mimeType: string }> {
    const tasks = await this.prisma.task.findMany({
      where: { conversationId },
      orderBy: [{ department: 'asc' }, { priority: 'asc' }],
    });

    if (tasks.length === 0) {
      throw new NotFoundException('No tasks found for this conversation');
    }

    const { formatTasksAsMarkdown } = await import(
      './formatters/markdown.formatter'
    );
    const { formatTasksAsJson } = await import('./formatters/json.formatter');
    const { formatTasksAsText } = await import('./formatters/text.formatter');

    let content: string;
    let filename: string;
    let mimeType: string;

    const timestamp = new Date().toISOString().split('T')[0];
    const deptSuffix = department ? `-${department.toLowerCase()}` : '';

    switch (format) {
      case 'markdown':
        content = formatTasksAsMarkdown(tasks, department);
        filename = `tasks${deptSuffix}-${timestamp}.md`;
        mimeType = 'text/markdown';
        break;

      case 'json':
        content = formatTasksAsJson(tasks, department);
        filename = `tasks${deptSuffix}-${timestamp}.json`;
        mimeType = 'application/json';
        break;

      case 'text':
        content = formatTasksAsText(tasks, department);
        filename = `tasks${deptSuffix}-${timestamp}.txt`;
        mimeType = 'text/plain';
        break;

      default:
        throw new BadRequestException('Invalid format');
    }

    this.logger.log(
      `Exported ${tasks.length} tasks as ${format} for conversation ${conversationId}`,
    );

    return { content, filename, mimeType };
  }
}
