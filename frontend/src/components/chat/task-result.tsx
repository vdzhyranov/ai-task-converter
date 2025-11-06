'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Task {
  id: string;
  description: string;
  acceptanceCriteria: string[];
  priority: number | null;
}

interface TasksByDepartment {
  design: Task[];
  frontend: Task[];
  backend: Task[];
}

interface TaskResultProps {
  tasks: TasksByDepartment;
  conversationId: string;
}

export function TaskResult({ tasks, conversationId }: TaskResultProps) {
  const totalTasks = tasks.design.length + tasks.frontend.length + tasks.backend.length;

  const renderDepartmentTasks = (
    departmentName: string,
    departmentTasks: Task[],
    color: string
  ) => {
    if (departmentTasks.length === 0) return null;

    return (
      <div key={departmentName} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge className={color}>{departmentName}</Badge>
          <span className="text-sm text-muted-foreground">
            {departmentTasks.length} tasks
          </span>
        </div>
        <div className="space-y-3">
          {departmentTasks.map((task, index) => (
            <Card key={task.id} className="border-l-4">
              <CardContent className="p-4">
                <p className="font-medium mb-2">
                  {index + 1}. {task.description}
                </p>
                {task.acceptanceCriteria.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {task.acceptanceCriteria.map((criteria, i) => (
                      <li key={i}>{criteria}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-2 border-green-500">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>✅ Tasks Generated Successfully!</span>
          <Badge variant="secondary">{totalTasks} Total Tasks</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your tasks have been generated and organized by department.
        </p>
      </CardHeader>
      <CardContent>
        {renderDepartmentTasks('Design', tasks.design, 'bg-purple-500')}
        {renderDepartmentTasks('Frontend', tasks.frontend, 'bg-blue-500')}
        {renderDepartmentTasks('Backend', tasks.backend, 'bg-green-500')}

        <div className="mt-6 pt-6 border-t flex justify-center">
          <Link href={`/dashboard?conversationId=${conversationId}`}>
            <Button size="lg">View Full Dashboard →</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
