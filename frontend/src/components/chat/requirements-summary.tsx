'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface RequirementsSummaryProps {
  summary: string;
  onApprove: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

export function RequirementsSummary({
  summary,
  onApprove,
  onReject,
  isLoading = false,
}: RequirementsSummaryProps) {
  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <CardTitle className="text-lg">Requirements Summary</CardTitle>
        <p className="text-sm text-muted-foreground">
          Please review the requirements below and approve to generate tasks, or reject to ask
          more questions.
        </p>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none whitespace-pre-wrap">{summary}</div>
      </CardContent>
      <Separator />
      <CardFooter className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onReject} disabled={isLoading}>
          Reject & Ask More
        </Button>
        <Button onClick={onApprove} disabled={isLoading}>
          {isLoading ? 'Generating Tasks...' : 'Approve & Generate Tasks'}
        </Button>
      </CardFooter>
    </Card>
  );
}
