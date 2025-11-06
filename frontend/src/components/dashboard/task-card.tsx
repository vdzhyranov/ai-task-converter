'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TaskCardProps {
  task: {
    id: string;
    description: string;
    acceptanceCriteria: string[];
    priority: number | null;
  };
  index: number;
}

export function TaskCard({ task, index }: TaskCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = `${task.description}\n\nAcceptance Criteria:\n${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium flex items-start gap-2">
            <span className="text-muted-foreground">#{index + 1}</span>
            <span>{task.description}</span>
          </CardTitle>
          {task.priority && (
            <Badge variant="outline" className="ml-2">
              P{task.priority}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.acceptanceCriteria.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Acceptance Criteria:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {task.acceptanceCriteria.map((criteria, i) => (
                <li key={i}>{criteria}</li>
              ))}
            </ul>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="w-full"
        >
          {copied ? '✓ Copied!' : 'Copy Task'}
        </Button>
      </CardContent>
    </Card>
  );
}
