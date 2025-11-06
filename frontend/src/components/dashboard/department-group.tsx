'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from './task-card';

interface Task {
  id: string;
  description: string;
  acceptanceCriteria: string[];
  priority: number | null;
}

interface DepartmentGroupProps {
  department: string;
  tasks: Task[];
  color: string;
}

export function DepartmentGroup({
  department,
  tasks,
  color,
}: DepartmentGroupProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const text = `${department} Tasks\n${'='.repeat(50)}\n\n${tasks
      .map(
        (task, i) =>
          `${i + 1}. ${task.description}\n\nAcceptance Criteria:\n${task.acceptanceCriteria.map((c, j) => `   ${j + 1}. ${c}`).join('\n')}\n`
      )
      .join('\n---\n\n')}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (tasks.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={color}>{department}</Badge>
            <CardTitle className="text-xl">{tasks.length} Tasks</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
          >
            {copied ? '✓ Copied All!' : 'Copy All'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task, index) => (
            <TaskCard key={task.id} task={task} index={index} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
