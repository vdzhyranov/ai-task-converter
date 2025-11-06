"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { RequirementsSummary } from "./requirements-summary";
import { TaskResult } from "./task-result";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ConversationStatus =
  | "ASKING_QUESTIONS"
  | "AWAITING_APPROVAL"
  | "GENERATING_TASKS"
  | "COMPLETED"
  | "FAILED";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  messageType: string;
  order: number;
}

export function ChatContainer() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConversationStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [requirementsSummary, setRequirementsSummary] = useState<string | null>(
    null
  );
  const [generatedTasks, setGeneratedTasks] = useState<any>(null);
  const [questionCount, setQuestionCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createMutation = trpc.conversations.create.useMutation();
  const answerMutation = trpc.conversations.answer.useMutation();
  const approveMutation = trpc.conversations.approve.useMutation();
  const rejectMutation = trpc.conversations.reject.useMutation();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartConversation = async (featureDescription: string) => {
    try {
      const result = await createMutation.mutateAsync({ featureDescription });

      setConversationId(result.conversationId);
      setStatus(result.status as ConversationStatus);
      setQuestionCount(result.questionCount);

      // Add feature description message
      setMessages([
        {
          id: "0",
          role: "USER",
          content: featureDescription,
          messageType: "FEATURE_DESCRIPTION",
          order: 0,
        },
        {
          id: result.question.id,
          role: "ASSISTANT",
          content: result.question.content,
          messageType: "CLARIFYING_QUESTION",
          order: result.question.order,
        },
      ]);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      setMessages([
        {
          id: "error",
          role: "SYSTEM",
          content: `Error: ${error.message}`,
          messageType: "ERROR",
          order: 0,
        },
      ]);
    }
  };

  const handleAnswerQuestion = async (answer: string) => {
    if (!conversationId) return;

    const currentOrder = messages.length;

    // Add user's answer to messages
    setMessages((prev) => [
      ...prev,
      {
        id: `answer-${currentOrder}`,
        role: "USER",
        content: answer,
        messageType: "ANSWER",
        order: currentOrder,
      },
    ]);

    try {
      const result = await answerMutation.mutateAsync({
        conversationId,
        answer,
      });

      if (result.status === "ASKING_QUESTIONS" && result.question) {
        // Add next question
        setMessages((prev) => [
          ...prev,
          {
            id: result.question.id,
            role: "ASSISTANT",
            content: result.question.content,
            messageType: "CLARIFYING_QUESTION",
            order: result.question.order,
          },
        ]);
        setQuestionCount(result.questionCount);
        setStatus("ASKING_QUESTIONS");
      } else if (
        result.status === "AWAITING_APPROVAL" &&
        result.requirementsSummary
      ) {
        // Show requirements summary
        setRequirementsSummary(result.requirementsSummary.content);
        setStatus("AWAITING_APPROVAL");
        setMessages((prev) => [
          ...prev,
          {
            id: result.requirementsSummary.id,
            role: "ASSISTANT",
            content: result.requirementsSummary.content,
            messageType: "REQUIREMENTS_SUMMARY",
            order: result.requirementsSummary.order,
          },
        ]);
      }
    } catch (error: any) {
      console.error("Error answering question:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: "error",
          role: "SYSTEM",
          content: `Error: ${error.message}`,
          messageType: "ERROR",
          order: currentOrder + 1,
        },
      ]);
    }
  };

  const handleApproveRequirements = async () => {
    if (!conversationId) return;

    setStatus("GENERATING_TASKS");

    try {
      const result = await approveMutation.mutateAsync({ conversationId });

      setGeneratedTasks(result.tasks);
      setStatus("COMPLETED");
    } catch (error: any) {
      console.error("Error approving requirements:", error);
      setStatus("FAILED");
      setMessages((prev) => [
        ...prev,
        {
          id: "error",
          role: "SYSTEM",
          content: `Error: ${error.message}`,
          messageType: "ERROR",
          order: messages.length,
        },
      ]);
    }
  };

  const handleRejectRequirements = async () => {
    if (!conversationId) return;

    try {
      const result = await rejectMutation.mutateAsync({
        conversationId,
        reason: "User requested changes",
      });

      setRequirementsSummary(null);
      setStatus("ASKING_QUESTIONS");
      setQuestionCount(result.questionCount);

      // Add rejection and new question
      setMessages((prev) => [
        ...prev,
        {
          id: "rejection",
          role: "USER",
          content: "Requirements rejected - asking for more clarity",
          messageType: "REJECTION",
          order: messages.length,
        },
        {
          id: result.question.id,
          role: "ASSISTANT",
          content: result.question.content,
          messageType: "CLARIFYING_QUESTION",
          order: result.question.order,
        },
      ]);
    } catch (error: any) {
      console.error("Error rejecting requirements:", error);
    }
  };

  const isLoading =
    createMutation.isPending ||
    answerMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>DevInsight Agent</span>
            {status && (
              <Badge variant="outline">
                {status.replace(/_/g, " ")}{" "}
                {questionCount > 0 && `(Q${questionCount}/5)`}
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            AI-Powered Feature to Task Converter
          </p>
        </CardHeader>
      </Card>

      {/* Messages Container */}
      <div className="mb-6 space-y-4 max-h-[60vh] overflow-y-auto">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            messageType={message.messageType as any}
          />
        ))}

        {/* Requirements Summary Card */}
        {status === "AWAITING_APPROVAL" && requirementsSummary && (
          <RequirementsSummary
            summary={requirementsSummary}
            onApprove={handleApproveRequirements}
            onReject={handleRejectRequirements}
            isLoading={isLoading}
          />
        )}

        {/* Task Result */}
        {status === "COMPLETED" && generatedTasks && conversationId && (
          <TaskResult tasks={generatedTasks} conversationId={conversationId} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!conversationId && (
        <ChatInput
          onSubmit={handleStartConversation}
          placeholder="Describe the feature you want to build... (e.g., 'Add user profile editing with avatar upload')"
          submitLabel="Start Conversation"
        />
      )}

      {conversationId && status === "ASKING_QUESTIONS" && (
        <ChatInput
          onSubmit={handleAnswerQuestion}
          disabled={isLoading}
          placeholder="Answer the question above..."
          submitLabel={isLoading ? "Sending..." : "Send Answer"}
        />
      )}

      {status === "GENERATING_TASKS" && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-pulse">
              <p className="text-lg font-medium">Generating tasks...</p>
              <p className="text-sm text-muted-foreground mt-2">
                This may take up to 30 seconds
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
