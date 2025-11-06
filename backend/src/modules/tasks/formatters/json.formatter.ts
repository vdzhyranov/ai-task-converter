import { Department } from '@prisma/client';

interface Task {
  id: string;
  description: string;
  acceptanceCriteria: string[];
  priority: number | null;
  department: Department;
}

export function formatTasksAsJson(
  tasks: Task[],
  department?: Department,
): string {
  const filteredTasks = department
    ? tasks.filter((t) => t.department === department)
    : tasks;

  // Group by department
  const tasksByDept = {
    design: filteredTasks.filter((t) => t.department === 'DESIGN'),
    frontend: filteredTasks.filter((t) => t.department === 'FRONTEND'),
    backend: filteredTasks.filter((t) => t.department === 'BACKEND'),
  };

  const output = {
    exportDate: new Date().toISOString(),
    totalTasks: filteredTasks.length,
    tasksByDepartment: {
      design: tasksByDept.design.map((t) => ({
        id: t.id,
        description: t.description,
        acceptanceCriteria: t.acceptanceCriteria,
        priority: t.priority,
      })),
      frontend: tasksByDept.frontend.map((t) => ({
        id: t.id,
        description: t.description,
        acceptanceCriteria: t.acceptanceCriteria,
        priority: t.priority,
      })),
      backend: tasksByDept.backend.map((t) => ({
        id: t.id,
        description: t.description,
        acceptanceCriteria: t.acceptanceCriteria,
        priority: t.priority,
      })),
    },
  };

  return JSON.stringify(output, null, 2);
}
