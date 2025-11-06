import { z } from 'zod';

export const exportTasksSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  format: z.enum(['markdown', 'json', 'text'], {
    errorMap: () => ({ message: 'Format must be markdown, json, or text' }),
  }),
  department: z.enum(['DESIGN', 'FRONTEND', 'BACKEND']).optional(),
});

export type ExportTasksDto = z.infer<typeof exportTasksSchema>;

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}
