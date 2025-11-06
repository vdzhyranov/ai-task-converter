import { Department } from '@prisma/client';

export interface TaskDto {
  id: string;
  conversationId: string;
  department: Department;
  description: string;
  acceptanceCriteria: string[];
  priority: number | null;
  createdAt: Date;
}

export interface TasksByDepartment {
  design: TaskDto[];
  frontend: TaskDto[];
  backend: TaskDto[];
}
