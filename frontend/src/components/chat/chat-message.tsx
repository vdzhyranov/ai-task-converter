"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";
type MessageType =
  | "FEATURE_DESCRIPTION"
  | "CLARIFYING_QUESTION"
  | "ANSWER"
  | "REQUIREMENTS_SUMMARY"
  | "APPROVAL"
  | "REJECTION"
  | "TASK_RESULT"
  | "ERROR";

interface ChatMessageProps {
  role: MessageRole;
  content: string;
  messageType: MessageType;
}

export function ChatMessage({ role, content, messageType }: ChatMessageProps) {
  const isUser = role === "USER";
  const isSystem = role === "SYSTEM";

  return (
    <div
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <Card
        className={cn(
          "max-w-[80%]",
          isUser && "bg-primary text-primary-foreground",
          isSystem && "bg-muted"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-2 mb-2">
            <Badge
              variant={isUser ? "secondary" : "outline"}
              className="text-xs"
            >
              {role === "USER" ? "You" : role === "ASSISTANT" ? "AI" : "System"}
            </Badge>
            <Badge
              variant={isUser ? "secondary" : "outline"}
              className="text-xs"
            >
              {messageType.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="whitespace-pre-wrap text-sm">{content}</div>
        </CardContent>
      </Card>
    </div>
  );
}
