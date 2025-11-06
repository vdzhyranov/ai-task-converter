import { Department } from '@prisma/client';

interface Task {
  id: string;
  description: string;
  acceptanceCriteria: string[];
  priority: number | null;
  department: Department;
}

export function formatTasksAsMarkdown(
  tasks: Task[],
  department?: Department,
): string {
  const filteredTasks = department
    ? tasks.filter((t) => t.department === department)
    : tasks;

  if (filteredTasks.length === 0) {
    return '# No tasks found\n';
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

  let markdown = '# Generated Tasks\n\n';

  // Add each department section
  const departments: Department[] = ['DESIGN', 'FRONTEND', 'BACKEND'];

  for (const dept of departments) {
    if (tasksByDept[dept].length === 0) continue;

    markdown += `## ${dept} (${tasksByDept[dept].length} tasks)\n\n`;

    tasksByDept[dept].forEach((task, index) => {
      markdown += `### ${index + 1}. ${task.description}\n\n`;

      if (task.priority) {
        markdown += `**Priority**: ${task.priority}\n\n`;
      }

      if (task.acceptanceCriteria.length > 0) {
        markdown += `**Acceptance Criteria**:\n\n`;
        task.acceptanceCriteria.forEach((criteria) => {
          markdown += `- ${criteria}\n`;
        });
        markdown += '\n';
      }

      markdown += '---\n\n';
    });
  }

  return markdown;
}
