import { Department } from '@prisma/client';

interface Task {
  id: string;
  description: string;
  acceptanceCriteria: string[];
  priority: number | null;
  department: Department;
}

export function formatTasksAsText(
  tasks: Task[],
  department?: Department,
): string {
  const filteredTasks = department
    ? tasks.filter((t) => t.department === department)
    : tasks;

  if (filteredTasks.length === 0) {
    return 'No tasks found\n';
  }

  // Group by department
  const tasksByDept: Record<Department, Task[]> = {
    DESIGN: [],
    FRONTEND: [],
    BACKEND: [],
  };

  filteredTasks.forEach((task) => {
    tasksByDept[task.department].push(task);
  });

  let text = '='.repeat(60) + '\n';
  text += 'GENERATED TASKS\n';
  text += '='.repeat(60) + '\n\n';

  const departments: Department[] = ['DESIGN', 'FRONTEND', 'BACKEND'];

  for (const dept of departments) {
    if (tasksByDept[dept].length === 0) continue;

    text += `\n${dept} (${tasksByDept[dept].length} tasks)\n`;
    text += '-'.repeat(60) + '\n\n';

    tasksByDept[dept].forEach((task, index) => {
      text += `${index + 1}. ${task.description}\n`;

      if (task.priority) {
        text += `   Priority: ${task.priority}\n`;
      }

      if (task.acceptanceCriteria.length > 0) {
        text += '   Acceptance Criteria:\n';
        task.acceptanceCriteria.forEach((criteria) => {
          text += `   - ${criteria}\n`;
        });
      }

      text += '\n';
    });
  }

  text += '='.repeat(60) + '\n';

  return text;
}
