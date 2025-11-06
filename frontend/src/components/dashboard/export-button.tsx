'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { trpc } from '@/lib/trpc';

interface ExportButtonProps {
  conversationId: string;
}

export function ExportButton({ conversationId }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportQuery = trpc.tasks.export.useQuery(
    {
      conversationId,
      format: 'markdown',
    },
    { enabled: false }
  );

  const handleExport = async (format: 'markdown' | 'json' | 'text') => {
    setIsExporting(true);

    try {
      const result = await exportQuery.refetch({
        queryKey: ['tasks.export', { conversationId, format }],
      } as any);

      if (result.data) {
        // Create blob and download
        const blob = new Blob([result.data.content], {
          type: result.data.mimeType,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Tasks</CardTitle>
        <CardDescription>
          Download tasks in your preferred format
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-3">
        <Button
          onClick={() => handleExport('markdown')}
          disabled={isExporting}
          variant="outline"
        >
          Markdown
        </Button>
        <Button
          onClick={() => handleExport('json')}
          disabled={isExporting}
          variant="outline"
        >
          JSON
        </Button>
        <Button
          onClick={() => handleExport('text')}
          disabled={isExporting}
          variant="outline"
        >
          Text
        </Button>
      </CardContent>
    </Card>
  );
}
