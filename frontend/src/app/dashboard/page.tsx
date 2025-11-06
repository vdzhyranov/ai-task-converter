"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { DepartmentGroup } from "@/components/dashboard/department-group";
import { ExportButton } from "@/components/dashboard/export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function DashboardContent() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversationId");

  const { data: conversation, isLoading, error } = trpc.conversations.get.useQuery(
    { conversationId: conversationId || "" },
    { enabled: !!conversationId, refetchOnWindowFocus: false } as any
  );

  if (!conversationId) {
    return (
      <div className="container mx-auto max-w-4xl py-16 px-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              No conversation ID provided
            </p>
            <Link href="/">
              <Button>Start New Conversation</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl py-16 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse text-center">
              <p>Loading dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="container mx-auto max-w-4xl py-16 px-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">
              {error?.message || "Conversation not found"}
            </p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tasksByDepartment = {
    design: conversation.tasks.filter((t: any) => t.department === "DESIGN"),
    frontend: conversation.tasks.filter(
      (t: any) => t.department === "FRONTEND"
    ),
    backend: conversation.tasks.filter((t: any) => t.department === "BACKEND"),
  };

  const totalTasks = conversation.tasks.length;

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">Task Dashboard</CardTitle>
              <p className="text-sm text-muted-foreground">
                {conversation.featureDescription.substring(0, 100)}
                {conversation.featureDescription.length > 100 && "..."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {totalTasks} Total Tasks
              </Badge>
              <Link href="/">
                <Button variant="outline">New Conversation</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Export Section */}
      <div className="mb-6">
        <ExportButton conversationId={conversationId} />
      </div>

      {/* Tasks by Department */}
      {totalTasks === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No tasks generated yet</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <DepartmentGroup
            department="Design"
            tasks={tasksByDepartment.design}
            color="bg-purple-500"
          />
          <DepartmentGroup
            department="Frontend"
            tasks={tasksByDepartment.frontend}
            color="bg-blue-500"
          />
          <DepartmentGroup
            department="Backend"
            tasks={tasksByDepartment.backend}
            color="bg-green-500"
          />
        </>
      )}

      {/* Conversation Details */}
      {conversation.requirementsSummary && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Requirements Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
              {conversation.requirementsSummary}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-16 px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse text-center">
                <p>Loading dashboard...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
